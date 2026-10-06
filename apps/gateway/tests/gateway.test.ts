import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";
import { FakeUpstreamClient } from "./fakes/FakeUpstreamClient.js";

const jsonResponse = (payload: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  body: Buffer.from(JSON.stringify(payload)),
});

describe("Gateway", () => {
  it("GET /health responds without touching any upstream", async () => {
    const fake = new FakeUpstreamClient(jsonResponse({}));
    const app = await buildServer({ upstreamClient: fake });

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(fake.lastRequest).toBeUndefined();
  });

  it("proxies POST /api/compile to the compiler target and relays the response body", async () => {
    const fake = new FakeUpstreamClient(jsonResponse({ success: true, svg: "<svg></svg>", diagnostics: [] }));
    const app = await buildServer({ upstreamClient: fake });

    const response = await app.inject({
      method: "POST",
      url: "/api/compile",
      payload: { source: "c1 = crear_circulo(radio=10, x=0, y=0);" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true });
    expect(fake.lastRequest).toMatchObject({ path: "/compile", method: "POST" });
  });

  it("relays the upstream's status code and content-type as-is (e.g. binary PNG export)", async () => {
    const fake = new FakeUpstreamClient({ status: 200, contentType: "image/png", body: Buffer.from([1, 2, 3]) });
    const app = await buildServer({ upstreamClient: fake });

    const response = await app.inject({
      method: "POST",
      url: "/api/export",
      payload: { source: "c1 = crear_circulo(radio=10, x=0, y=0);", format: "png" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/png");
  });

  it("rejects a request that fails schema validation before it ever reaches the upstream", async () => {
    const fake = new FakeUpstreamClient(jsonResponse({}));
    const app = await buildServer({ upstreamClient: fake });

    const response = await app.inject({ method: "POST", url: "/api/compile", payload: { source: "" } });

    expect(response.statusCode).toBe(400);
    expect(fake.lastRequest).toBeUndefined();
  });

  it("rejects an /api/export request with an unsupported format before proxying", async () => {
    const fake = new FakeUpstreamClient(jsonResponse({}));
    const app = await buildServer({ upstreamClient: fake });

    const response = await app.inject({
      method: "POST",
      url: "/api/export",
      payload: { source: "c1 = crear_circulo(radio=10, x=0, y=0);", format: "gif" },
    });

    expect(response.statusCode).toBe(400);
    expect(fake.lastRequest).toBeUndefined();
  });

  it("returns the centralized error format for an unknown route", async () => {
    const fake = new FakeUpstreamClient(jsonResponse({}));
    const app = await buildServer({ upstreamClient: fake });

    const response = await app.inject({ method: "GET", url: "/does-not-exist" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { statusCode: 404 } });
  });

  it("rejects an unauthenticated request to a route that requires a JWT", async () => {
    const fake = new FakeUpstreamClient(jsonResponse({}));
    const app = await buildServer({ upstreamClient: fake });

    const response = await app.inject({ method: "GET", url: "/api/projects" });

    expect(response.statusCode).toBe(401);
    expect(fake.lastRequest).toBeUndefined();
  });

  it("forwards the verified user id as x-user-id on an authenticated request", async () => {
    const fake = new FakeUpstreamClient(jsonResponse({ projects: [] }));
    const app = await buildServer({ upstreamClient: fake });
    const token = app.jwt.sign({ sub: "user-42", email: "ana@example.com" });

    const response = await app.inject({
      method: "GET",
      url: "/api/projects",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(fake.lastRequest?.headers).toMatchObject({ "x-user-id": "user-42" });
  });

  it("resolves :id in both the public path and the upstream path template", async () => {
    const fake = new FakeUpstreamClient(jsonResponse({ project: { id: "proj-1" } }));
    const app = await buildServer({ upstreamClient: fake });
    const token = app.jwt.sign({ sub: "user-42", email: "ana@example.com" });

    const response = await app.inject({
      method: "GET",
      url: "/api/projects/proj-1",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(fake.lastRequest).toMatchObject({ path: "/projects/proj-1", method: "GET" });
  });

  it("proxies POST /api/ai/suggest to the ai target anonymously", async () => {
    const fake = new FakeUpstreamClient(jsonResponse({ dslSource: "c1 = crear_circulo(radio=1, x=0, y=0);", valid: true, diagnostics: [] }));
    const app = await buildServer({ upstreamClient: fake });

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/suggest",
      payload: { prompt: "un círculo rojo" },
    });

    expect(response.statusCode).toBe(200);
    expect(fake.lastRequest).toMatchObject({ path: "/suggest", method: "POST" });
    expect(fake.lastRequest?.headers?.["x-user-id"]).toBeUndefined();
  });

  it("proxies POST /api/ai/explain-error to the ai target", async () => {
    const fake = new FakeUpstreamClient(jsonResponse({ explanation: "..." }));
    const app = await buildServer({ upstreamClient: fake });

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/explain-error",
      payload: {
        source: "x",
        diagnostics: [{ severity: "error", message: "msg", position: { line: 1, column: 1 } }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fake.lastRequest).toMatchObject({ path: "/explain-error", method: "POST" });
  });
});
