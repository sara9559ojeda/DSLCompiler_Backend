import Anthropic from "@anthropic-ai/sdk";
import type { IClaudeClient } from "./IClaudeClient.js";

export class AnthropicClaudeClient implements IClaudeClient {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly maxTokens: number,
    timeoutMs = 30_000,
  ) {
    // One SDK-level retry is enough: the assist loop does its own bounded retries on invalid DSL.
    this.client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 1 });
  }

  async complete(systemPrompt: string, userPrompt: string, options: { readonly signal?: AbortSignal } = {}): Promise<string> {
    const response = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      },
      options.signal ? { signal: options.signal } : undefined,
    );

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.type === "text" ? textBlock.text : "";
  }
}
