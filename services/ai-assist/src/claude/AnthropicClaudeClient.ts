import Anthropic from "@anthropic-ai/sdk";
import type { IClaudeClient } from "./IClaudeClient.js";

export class AnthropicClaudeClient implements IClaudeClient {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly maxTokens: number,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.type === "text" ? textBlock.text : "";
  }
}
