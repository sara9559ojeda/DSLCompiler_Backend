import { describe, expect, it } from "vitest";
import { ExplainErrorService } from "../src/explanation/ExplainErrorService.js";
import { FakeClaudeClient } from "./fakes/FakeClaudeClient.js";

describe("ExplainErrorService", () => {
  it("includes the numbered source and each diagnostic in the prompt sent to Claude", async () => {
    const claudeClient = new FakeClaudeClient("Te falta el parámetro 'radio' en la línea 1.");
    const service = new ExplainErrorService(claudeClient, "system prompt");

    const explanation = await service.explain("c1 = crear_circulo(x=0, y=0);", [
      { severity: "error", message: "Falta el parámetro requerido 'radio'.", position: { line: 1, column: 1 } },
    ]);

    expect(explanation).toBe("Te falta el parámetro 'radio' en la línea 1.");
    expect(claudeClient.calls[0]?.systemPrompt).toBe("system prompt");
    expect(claudeClient.calls[0]?.userPrompt).toContain("1: c1 = crear_circulo(x=0, y=0);");
    expect(claudeClient.calls[0]?.userPrompt).toContain("Falta el parámetro requerido 'radio'.");
  });
});
