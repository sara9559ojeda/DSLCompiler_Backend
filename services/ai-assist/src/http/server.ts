import Fastify, { type FastifyInstance } from "fastify";
import type { IClaudeClient } from "../claude/IClaudeClient.js";
import { AnthropicClaudeClient } from "../claude/AnthropicClaudeClient.js";
import type { IDslValidator } from "../validation/IDslValidator.js";
import { DslValidator } from "../validation/DslValidator.js";
import { SuggestionService } from "../suggestion/SuggestionService.js";
import { ExplainErrorService } from "../explanation/ExplainErrorService.js";
import { registerSuggestRoute } from "../routes/suggestRoutes.js";
import { registerExplainErrorRoute } from "../routes/explainErrorRoutes.js";
import { buildDslSystemPrompt } from "../prompts/buildDslSystemPrompt.js";
import { buildExplainSystemPrompt } from "../prompts/buildExplainSystemPrompt.js";
import { ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_MAX_TOKENS } from "../config/ai-assist.config.js";
import { registerErrorHandler } from "./errorHandler.js";

export interface BuildServerOptions {
  /** Injected in tests to avoid real network calls / needing an API key (DIP). */
  readonly claudeClient?: IClaudeClient;
  readonly validator?: IDslValidator;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const fastify = Fastify({ logger: false });
  registerErrorHandler(fastify);

  const claudeClient =
    options.claudeClient ?? new AnthropicClaudeClient(ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_MAX_TOKENS);
  const validator = options.validator ?? new DslValidator();

  const suggestionService = new SuggestionService(claudeClient, validator, buildDslSystemPrompt());
  const explainErrorService = new ExplainErrorService(claudeClient, buildExplainSystemPrompt());

  fastify.get("/health", async () => ({ status: "ok" }));
  registerSuggestRoute(fastify, { suggestionService });
  registerExplainErrorRoute(fastify, { explainErrorService });

  return fastify;
}
