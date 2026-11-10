import type { IClaudeClient } from "./IClaudeClient.js";
import { AnthropicClaudeClient } from "./AnthropicClaudeClient.js";
import { UnconfiguredClaudeClient } from "./UnconfiguredClaudeClient.js";

export interface ClaudeClientSettings {
  readonly apiKey: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly timeoutMs: number;
}

/** Picks the real client only when an API key is present; the composition root stays free of that branching. */
export function createClaudeClient(settings: ClaudeClientSettings): IClaudeClient {
  if (settings.apiKey.trim() === "") return new UnconfiguredClaudeClient();
  return new AnthropicClaudeClient(settings.apiKey, settings.model, settings.maxTokens, settings.timeoutMs);
}
