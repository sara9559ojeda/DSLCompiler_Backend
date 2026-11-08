/**
 * Abstraction the suggestion/explanation services depend on instead of the
 * Anthropic SDK directly (Dependency Inversion) — tests inject a fake so
 * the suite never makes a real network call or needs an API key.
 */
export interface IClaudeClient {
  /** `signal` aborts the request (the user cancelled or disconnected), so no tokens are spent for nobody. */
  complete(systemPrompt: string, userPrompt: string, options?: { readonly signal?: AbortSignal }): Promise<string>;
}
