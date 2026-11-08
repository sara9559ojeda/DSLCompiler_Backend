import type { Diagnostic } from "@saramariaojeda9559/compiler-core";
import type { IClaudeClient } from "../claude/IClaudeClient.js";
import type { IDslValidator, ValidationResult } from "../validation/IDslValidator.js";
import { extractDslCode } from "../prompts/extractDslCode.js";
import {
  buildExplainCodeSystemPrompt,
  buildExplainCodeUserPrompt,
  buildGenerateSystemPrompt,
  buildGenerateUserPrompt,
  buildModifySystemPrompt,
  buildModifyUserPrompt,
  buildRepairUserPrompt,
} from "../prompts/buildAssistPrompts.js";

export type AssistMode = "generate" | "modify" | "explain";

export interface AssistRequest {
  readonly mode: AssistMode;
  /** What the user asked for (generate/modify) or a question about the code (explain). */
  readonly prompt: string;
  /** The program being modified or explained. */
  readonly source?: string;
}

export interface AssistAttempt {
  readonly attempt: number;
  readonly valid: boolean;
  readonly errors: number;
}

export type AssistResult =
  | {
      readonly mode: "generate" | "modify";
      readonly dslSource: string;
      /** True only when the compiler accepted `dslSource`. The user still has to accept it. */
      readonly valid: boolean;
      readonly diagnostics: readonly Diagnostic[];
      /** Preview of `dslSource`, rendered by the compiler itself (null when it didn't compile). */
      readonly svg: string | null;
      readonly attempts: readonly AssistAttempt[];
    }
  | {
      readonly mode: "explain";
      readonly explanation: string;
      readonly diagnostics: readonly Diagnostic[];
      readonly attempts: readonly AssistAttempt[];
    };

export interface AssistLimits {
  /** Calls to the model per request (the first try plus repairs). */
  readonly maxAttempts: number;
  /** After this long (ms) no new attempt starts. */
  readonly deadlineMs: number;
  /** Longest program accepted from the model, in characters. */
  readonly maxOutputChars: number;
}

/** A request that can't be served as sent (400), as opposed to a failure of the model (5xx). */
export class AssistInputError extends Error {
  readonly statusCode = 400;
}

const syntheticError = (message: string): Diagnostic => ({
  severity: "error",
  code: "AI-001",
  message,
  position: { line: 1, column: 1 },
});

/**
 * The assistant. The model only ever *proposes*: every candidate goes through
 * the real compiler (the one authority on what is valid and what it looks
 * like), failures are fed back to the model with the compiler's own
 * diagnostics, and the loop is bounded in attempts and in time. The result
 * says honestly whether the last proposal compiled; nothing is applied here.
 */
export class AssistService {
  constructor(
    private readonly claude: IClaudeClient,
    private readonly validator: IDslValidator,
    private readonly limits: AssistLimits,
    private readonly now: () => number = Date.now,
  ) {}

  async assist(request: AssistRequest, signal?: AbortSignal): Promise<AssistResult> {
    const prompt = request.prompt.trim();
    const source = request.source ?? "";

    if (request.mode === "explain") {
      if (source.trim() === "") throw new AssistInputError("Falta el código que se debe explicar.");
      return this.explain(prompt, source, signal);
    }
    if (prompt === "") throw new AssistInputError("Escribe qué quieres que haga el asistente.");
    if (request.mode === "modify" && source.trim() === "") throw new AssistInputError("Falta el código que se debe modificar.");
    return this.propose(request.mode, prompt, source, signal);
  }

  private async propose(mode: "generate" | "modify", prompt: string, source: string, signal?: AbortSignal): Promise<AssistResult> {
    const startedAt = this.now();
    const system = mode === "modify" ? buildModifySystemPrompt() : buildGenerateSystemPrompt();
    const attempts: AssistAttempt[] = [];
    let candidate = "";
    let check: ValidationResult = { success: false, diagnostics: [] };

    for (let attempt = 1; attempt <= this.limits.maxAttempts; attempt += 1) {
      if (signal?.aborted) throw new Error("Solicitud cancelada.");
      if (attempt > 1 && this.now() - startedAt > this.limits.deadlineMs) break;

      const user =
        attempt === 1
          ? mode === "modify"
            ? buildModifyUserPrompt(prompt, source)
            : buildGenerateUserPrompt(prompt)
          : buildRepairUserPrompt(prompt, mode === "modify" ? source : undefined, candidate, check.diagnostics);

      candidate = extractDslCode(await this.claude.complete(system, user, signal ? { signal } : undefined));
      check = this.check(candidate);
      attempts.push({ attempt, valid: check.success, errors: check.diagnostics.filter((d) => d.severity === "error").length });
      if (check.success) break;
    }

    return {
      mode,
      dslSource: candidate,
      valid: check.success,
      diagnostics: check.diagnostics,
      svg: check.success ? (check.svg ?? null) : null,
      attempts,
    };
  }

  private check(candidate: string): ValidationResult {
    if (candidate === "") return { success: false, diagnostics: [syntheticError("El asistente no devolvió ningún programa.")] };
    if (candidate.length > this.limits.maxOutputChars) {
      return { success: false, diagnostics: [syntheticError(`El programa generado supera el máximo de ${this.limits.maxOutputChars} caracteres.`)] };
    }
    return this.validator.validate(candidate);
  }

  private async explain(question: string, source: string, signal?: AbortSignal): Promise<AssistResult> {
    // The diagnostics come from compiling the code here, never from what the client claims.
    const { diagnostics } = this.validator.validate(source);
    const explanation = await this.claude.complete(
      buildExplainCodeSystemPrompt(),
      buildExplainCodeUserPrompt(source, question, diagnostics),
      signal ? { signal } : undefined,
    );
    return { mode: "explain", explanation: explanation.trim(), diagnostics, attempts: [{ attempt: 1, valid: true, errors: 0 }] };
  }
}
