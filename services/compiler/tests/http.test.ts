import { describe, expect, it } from "vitest";
import { buildServer } from "../src/http/server.js";

describe("Compiler HTTP server", () => {
  it("GET /health reports ok", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("POST /compile returns an SVG document for a valid program", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/compile",
      payload: { source: "c1 = crear_circulo(radio=10, x=0, y=0);" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.svg).toContain("<circle");
  });

  it("POST /compile returns diagnostics (200, success: false) for an invalid program", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/compile",
      payload: { source: "crear_circulo(x=0, y=0);" }, // missing required 'radio'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.diagnostics.length).toBeGreaterThan(0);
  });

  it("POST /compile rejects a malformed request body with 400", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "POST", url: "/compile", payload: {} });
    expect(response.statusCode).toBe(400);
  });

  it("POST /export returns image/svg+xml for format=svg", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/export",
      payload: { source: "c1 = crear_circulo(radio=10, x=0, y=0);", format: "svg" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/svg+xml");
  });

  it("POST /export returns image/png for format=png", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/export",
      payload: { source: "c1 = crear_circulo(radio=10, x=0, y=0);", format: "png" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/png");
  });

  it("POST /export rejects an unsupported format at the schema level", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/export",
      payload: { source: "c1 = crear_circulo(radio=10, x=0, y=0);", format: "gif" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("POST /export returns 422 with diagnostics for a program that fails to compile", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/export",
      payload: { source: "crear_circulo(x=0, y=0);", format: "svg" },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().diagnostics.length).toBeGreaterThan(0);
  });

  it("POST /stages returns tokens, AST, IR and timings", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/stages",
      payload: { source: "c1 = crear_circulo(radio=10, x=0, y=0);" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.tokens.length).toBeGreaterThan(0);
    expect(JSON.parse(body.astJson).node).toBe("ProgramNode");
    expect(body.timings).toHaveLength(4);
  });

  it("POST /compile rejects a source over the size limit with 400", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "POST", url: "/compile", payload: { source: "x".repeat(200_001) } });
    expect(response.statusCode).toBe(400);
  });
});
