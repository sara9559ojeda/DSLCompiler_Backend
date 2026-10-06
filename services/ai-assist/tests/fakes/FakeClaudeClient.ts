import type { IClaudeClient } from "../../src/claude/IClaudeClient.js";

export interface RecordedCall {
  readonly systemPrompt: string;
  readonly userPrompt: string;
}

/** Returns queued responses in order (one per call) — lets tests script a "bad answer, then good answer" retry sequence. */
export class FakeClaudeClient implements IClaudeClient {
  public readonly calls: RecordedCall[] = [];
  private readonly responses: string[];

  constructor(...responses: string[]) {
    this.responses = [...responses];
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    this.calls.push({ systemPrompt, userPrompt });
    const next = this.responses.shift();
    if (next === undefined) {
      throw new Error("FakeClaudeClient: no more scripted responses.");
    }
    return next;
  }
}
