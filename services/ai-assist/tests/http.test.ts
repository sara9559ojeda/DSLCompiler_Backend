import { describe, expect, it } from "vitest";
import { buildServer } from "../src/http/server.js";
import { FakeClaudeClient } from "./fakes/FakeClaudeClient.js";

const VALID_DSL = "c1 = crear_circulo(radio=50, color=rojo, x=100, y=100);";

describe("ai-assist HTTP server", () => {
  it("GET /health reports ok", async () => {
    const app = buildServer({ claudeClient: new FakeClaudeClient() });
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("POST /suggest returns valid DSL generated from a prompt", async () => {
    const app = buildServer({ claudeClient: new FakeClaudeClient(VALID_DSL) });

    const response = await app.inject({
      method: "POST",
      url: "/suggest",
      payload: { prompt: "un círculo rojo en el centro" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ valid: true, dslSource: VALID_DSL });
  });

  it("POST /suggest rejects an empty prompt at the schema level", async () => {
    const app = buildServer({ claudeClient: new FakeClaudeClient() });
    const response = await app.inject({ method: "POST", url: "/suggest", payload: { prompt: "" } });
    expect(response.statusCode).toBe(400);
  });

  it("POST /explain-error returns Claude's explanation", async () => {
    const app = buildServer({ claudeClient: new FakeClaudeClient("Te falta el radio del círculo.") });

    const response = await app.inject({
      method: "POST",
      url: "/explain-error",
      payload: {
        source: "c1 = crear_circulo(x=0, y=0);",
        diagnostics: [
          { severity: "error", message: "Falta el parámetro requerido 'radio'.", position: { line: 1, column: 1 } },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ explanation: "Te falta el radio del círculo." });
  });

  it("POST /explain-error rejects a request with no diagnostics", async () => {
    const app = buildServer({ claudeClient: new FakeClaudeClient() });
    const response = await app.inject({
      method: "POST",
      url: "/explain-error",
      payload: { source: "x", diagnostics: [] },
    });
    expect(response.statusCode).toBe(400);
  });
});
