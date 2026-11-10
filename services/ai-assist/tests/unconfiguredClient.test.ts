import { describe, expect, it } from "vitest";
import { buildServer } from "../src/http/server.js";
import { createClaudeClient } from "../src/claude/createClaudeClient.js";
import { AnthropicClaudeClient } from "../src/claude/AnthropicClaudeClient.js";
import { ASSISTANT_NOT_CONFIGURED_MESSAGE, UnconfiguredClaudeClient } from "../src/claude/UnconfiguredClaudeClient.js";

const settings = { model: "claude-haiku-4-5", maxTokens: 1024, timeoutMs: 1000 };

describe("createClaudeClient", () => {
  it("returns the unconfigured client when the API key is empty", () => {
    expect(createClaudeClient({ ...settings, apiKey: "" })).toBeInstanceOf(UnconfiguredClaudeClient);
  });

  it("treats a whitespace-only API key as missing", () => {
    expect(createClaudeClient({ ...settings, apiKey: "   " })).toBeInstanceOf(UnconfiguredClaudeClient);
  });

  it("returns the Anthropic client when an API key is present", () => {
    expect(createClaudeClient({ ...settings, apiKey: "test-key" })).toBeInstanceOf(AnthropicClaudeClient);
  });
});

describe("ai-assist without an API key", () => {
  const app = buildServer({ claudeClient: new UnconfiguredClaudeClient() });

  it("answers /assist with 503 and a message the user can read", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/assist",
      payload: { mode: "generate", prompt: "un círculo rojo" },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: { message: ASSISTANT_NOT_CONFIGURED_MESSAGE, statusCode: 503 } });
  });

  it("answers /suggest with the same 503", async () => {
    const response = await app.inject({ method: "POST", url: "/suggest", payload: { prompt: "un círculo rojo" } });
    expect(response.statusCode).toBe(503);
  });

  it("keeps /health up so the service is not restarted for a missing key", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
  });
});
