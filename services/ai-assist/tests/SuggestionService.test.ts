import { describe, expect, it } from "vitest";
import { SuggestionService } from "../src/suggestion/SuggestionService.js";
import { DslValidator } from "../src/validation/DslValidator.js";
import { FakeClaudeClient } from "./fakes/FakeClaudeClient.js";

const VALID_DSL = "c1 = crear_circulo(radio=50, color=rojo, x=100, y=100);";
const INVALID_DSL = "c1 = crear_circulo(x=0, y=0);"; // missing required 'radio'

describe("SuggestionService", () => {
  it("returns the first answer as-is when it already compiles", async () => {
    const claudeClient = new FakeClaudeClient(VALID_DSL);
    const service = new SuggestionService(claudeClient, new DslValidator(), "system prompt");

    const result = await service.suggest("un círculo rojo");

    expect(result).toEqual({ dslSource: VALID_DSL, valid: true, diagnostics: [] });
    expect(claudeClient.calls).toHaveLength(1);
  });

  it("retries once, feeding back the compiler diagnostics, when the first answer doesn't compile", async () => {
    const claudeClient = new FakeClaudeClient(INVALID_DSL, VALID_DSL);
    const service = new SuggestionService(claudeClient, new DslValidator(), "system prompt");

    const result = await service.suggest("un círculo rojo");

    expect(result.valid).toBe(true);
    expect(result.dslSource).toBe(VALID_DSL);
    expect(claudeClient.calls).toHaveLength(2);
    expect(claudeClient.calls[1]?.userPrompt).toContain("radio");
  });

  it("gives up after one retry and reports the diagnostics if still invalid", async () => {
    const claudeClient = new FakeClaudeClient(INVALID_DSL, INVALID_DSL);
    const service = new SuggestionService(claudeClient, new DslValidator(), "system prompt");

    const result = await service.suggest("un círculo rojo");

    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(claudeClient.calls).toHaveLength(2);
  });

  it("strips a markdown code fence if the model wraps its answer in one", async () => {
    const claudeClient = new FakeClaudeClient("```\n" + VALID_DSL + "\n```");
    const service = new SuggestionService(claudeClient, new DslValidator(), "system prompt");

    const result = await service.suggest("un círculo rojo");

    expect(result.dslSource).toBe(VALID_DSL);
    expect(result.valid).toBe(true);
  });
});
