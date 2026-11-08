import Fastify, { type FastifyInstance } from "fastify";
import type { IClaudeClient } from "../claude/IClaudeClient.js";
import { AnthropicClaudeClient } from "../claude/AnthropicClaudeClient.js";
import type { IDslValidator } from "../validation/IDslValidator.js";
import { DslValidator } from "../validation/DslValidator.js";
import { SuggestionService } from "../suggestion/SuggestionService.js";
import { ExplainErrorService } from "../explanation/ExplainErrorService.js";
import { registerSuggestRoute } from "../routes/suggestRoutes.js";
import { AssistService } from "../assist/AssistService.js";
import { registerAssistRoute } from "../routes/assistRoutes.js";
import { registerExplainErrorRoute } from "../routes/explainErrorRoutes.js";
import { buildDslSystemPrompt } from "../prompts/buildDslSystemPrompt.js";
import { buildExplainSystemPrompt } from "../prompts/buildExplainSystemPrompt.js";
import {
  ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL,
  ANTHROPIC_MAX_TOKENS,
  ANTHROPIC_TIMEOUT_MS,
  ASSIST_MAX_ATTEMPTS,
  ASSIST_DEADLINE_MS,
  ASSIST_MAX_OUTPUT_CHARS,
} from "../config/ai-assist.config.js";
import { registerErrorHandler } from "./errorHandler.js";

export interface BuildServerOptions {
  /** Injected in tests to avoid real network calls / needing an API key (DIP). */
  readonly claudeClient?: IClaudeClient;
  readonly validator?: IDslValidator;
  /** Tests shrink these (e.g. one attempt); production uses the config defaults. */
  readonly assistLimits?: { readonly maxAttempts: number; readonly deadlineMs: number; readonly maxOutputChars: number };
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const fastify = Fastify({ logger: false });
  registerErrorHandler(fastify);

  const claudeClient =
    options.claudeClient ?? new AnthropicClaudeClient(ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_MAX_TOKENS, ANTHROPIC_TIMEOUT_MS);
  const validator = options.validator ?? new DslValidator();

  const suggestionService = new SuggestionService(claudeClient, validator, buildDslSystemPrompt());
  const explainErrorService = new ExplainErrorService(claudeClient, buildExplainSystemPrompt());

  const assistService = new AssistService(
    claudeClient,
    validator,
    options.assistLimits ?? { maxAttempts: ASSIST_MAX_ATTEMPTS, deadlineMs: ASSIST_DEADLINE_MS, maxOutputChars: ASSIST_MAX_OUTPUT_CHARS },
  );

  fastify.get("/health", async () => ({ status: "ok" }));
  registerSuggestRoute(fastify, { suggestionService });
  registerExplainErrorRoute(fastify, { explainErrorService });
  registerAssistRoute(fastify, { assistService });

  return fastify;
}
