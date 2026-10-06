/**
 * Abstraction the suggestion/explanation services depend on instead of the
 * Anthropic SDK directly (Dependency Inversion) — tests inject a fake so
 * the suite never makes a real network call or needs an API key.
 */
export interface IClaudeClient {
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
}
