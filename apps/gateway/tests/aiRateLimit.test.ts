import { describe, expect, it } from "vitest";

// Set before gateway.config.ts is first evaluated (dynamic import below).
process.env.AI_RATE_LIMIT_MAX = "2";
process.env.AI_RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_MAX = "1000";

describe("AI assistant rate limiting", () => {
  it("limits /api/ai/assist per client far below the gateway-wide limit", async () => {
    const { buildServer } = await import("../src/server.js");
    const { FakeUpstreamClient } = await import("./fakes/FakeUpstreamClient.js");
    const upstream = new FakeUpstreamClient({ status: 200, contentType: "application/json", body: Buffer.from("{}") });
    const app = await buildServer({ upstreamClient: upstream });
    const call = () => app.inject({ method: "POST", url: "/api/ai/assist", payload: { mode: "generate", prompt: "una casa" } });

    expect((await call()).statusCode).toBe(200);
    expect((await call()).statusCode).toBe(200);
    expect((await call()).statusCode).toBe(429);

    // Other routes keep their own, much larger budget.
    expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
  });

  it("validates the body before reaching the model", async () => {
    const { buildServer } = await import("../src/server.js");
    const { FakeUpstreamClient } = await import("./fakes/FakeUpstreamClient.js");
    const app = await buildServer({
      upstreamClient: new FakeUpstreamClient({ status: 200, contentType: "application/json", body: Buffer.from("{}") }),
    });
    const response = await app.inject({ method: "POST", url: "/api/ai/assist", payload: { mode: "generate", prompt: "x".repeat(1001) } });
    expect(response.statusCode).toBe(400);
  });
});
