import { describe, expect, it } from "vitest";
import { buildServer } from "../src/http/server.js";
import type { IClaudeClient } from "../src/claude/IClaudeClient.js";

class ThrowingClaudeClient implements IClaudeClient {
  async complete(): Promise<string> {
    throw new Error("Could not resolve authentication method: missing API key");
  }
}

describe("ai-assist error handling", () => {
  it("masks an internal (5xx) error with a generic message instead of leaking SDK details", async () => {
    const app = buildServer({ claudeClient: new ThrowingClaudeClient() });

    const response = await app.inject({
      method: "POST",
      url: "/suggest",
      payload: { prompt: "un círculo rojo" },
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.error.message).not.toContain("API key");
    expect(body.error.statusCode).toBe(500);
  });

  it("keeps the specific message for a schema validation (400) error", async () => {
    const app = buildServer({ claudeClient: new ThrowingClaudeClient() });

    const response = await app.inject({ method: "POST", url: "/suggest", payload: { prompt: "" } });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toBeTruthy();
  });
});
