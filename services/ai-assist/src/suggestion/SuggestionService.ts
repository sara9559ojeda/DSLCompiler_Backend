import type { Diagnostic } from "@saramariaojeda9559/compiler-core";
import type { IClaudeClient } from "../claude/IClaudeClient.js";
import type { IDslValidator } from "../validation/IDslValidator.js";
import { extractDslCode } from "../prompts/extractDslCode.js";
import { buildRetryPrompt } from "../prompts/buildRetryPrompt.js";

export interface SuggestionResult {
  readonly dslSource: string;
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Turns a natural-language description into DSL source, self-correcting
 * once against the real compiler before answering. This is what separates
 * this endpoint from a bare LLM passthrough: the response is never returned
 * without first being checked by the same pipeline the rest of the system
 * compiles through.
 */
export class SuggestionService {
  constructor(
    private readonly claudeClient: IClaudeClient,
    private readonly validator: IDslValidator,
    private readonly systemPrompt: string,
  ) {}

  async suggest(userPrompt: string): Promise<SuggestionResult> {
    const first = await this.generate(userPrompt);
    const firstCheck = this.validator.validate(first);
    if (firstCheck.success) {
      return { dslSource: first, valid: true, diagnostics: [] };
    }

    const retryPrompt = buildRetryPrompt(userPrompt, first, firstCheck.diagnostics);
    const second = await this.generate(retryPrompt);
    const secondCheck = this.validator.validate(second);
    return { dslSource: second, valid: secondCheck.success, diagnostics: secondCheck.diagnostics };
  }

  private async generate(userPrompt: string): Promise<string> {
    const raw = await this.claudeClient.complete(this.systemPrompt, userPrompt);
    return extractDslCode(raw);
  }
}
