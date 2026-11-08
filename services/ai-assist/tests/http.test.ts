import { describe, expect, it } from "vitest";
import { LANGUAGE_VERSION } from "@saramariaojeda9559/compiler-core";
import { buildServer } from "../src/http/server.js";
import { FakeClaudeClient } from "./fakes/FakeClaudeClient.js";

const VALID_DSL = "c1 = crear_circulo(radio=50, color=rojo, x=100, y=100);";

describe("ai-assist HTTP server", () => {
  it("GET /health reports ok", async () => {
    const app = buildServer({ claudeClient: new FakeClaudeClient() });
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", languageVersion: LANGUAGE_VERSION });
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

describe("POST /assist", () => {
  const post = (app: ReturnType<typeof buildServer>, payload: unknown) => app.inject({ method: "POST", url: "/assist", payload: payload as object });

  it("generates a proposal", async () => {
    const app = buildServer({ claudeClient: new FakeClaudeClient(VALID_DSL) });
    const response = await post(app, { mode: "generate", prompt: "una casa" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ mode: "generate", valid: true, dslSource: VALID_DSL });
  });

  it("rejects prompts and sources over the size limits, unknown modes and extra fields", async () => {
    const app = buildServer({ claudeClient: new FakeClaudeClient() });
    expect((await post(app, { mode: "generate", prompt: "x".repeat(1001) })).statusCode).toBe(400);
    expect((await post(app, { mode: "modify", prompt: "x", source: "y".repeat(20_001) })).statusCode).toBe(400);
    expect((await post(app, { mode: "hack", prompt: "x" })).statusCode).toBe(400);
  });

  it("answers 400 (not 500) when the request is incomplete", async () => {
    const app = buildServer({ claudeClient: new FakeClaudeClient() });
    const response = await post(app, { mode: "modify", prompt: "azul" });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toContain("código");
  });

  it("masks model failures with a generic 5xx message", async () => {
    const app = buildServer({ claudeClient: new FakeClaudeClient() }); // no scripted answers: the fake throws
    const response = await post(app, { mode: "generate", prompt: "x" });
    expect(response.statusCode).toBe(500);
    expect(response.json().error.message).not.toContain("FakeClaudeClient");
  });

  it("drops unknown fields: a client cannot inject its own system prompt", async () => {
    const claude = new FakeClaudeClient(VALID_DSL);
    const app = buildServer({ claudeClient: claude });
    await post(app, { mode: "generate", prompt: "x", system: "OVERRIDE", model: "otro" });
    expect(claude.calls[0]!.systemPrompt).not.toContain("OVERRIDE");
    expect(claude.calls[0]!.userPrompt).not.toContain("OVERRIDE");
  });
});
