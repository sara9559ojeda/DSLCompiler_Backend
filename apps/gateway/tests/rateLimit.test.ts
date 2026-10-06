import { describe, expect, it } from "vitest";

// Env vars must be set before gateway.config.ts (imported transitively by
// server.ts) is first evaluated, so this file uses a dynamic import instead
// of a static one. Vitest isolates each test file's module graph by
// default, so this doesn't affect RATE_LIMIT_MAX in gateway.test.ts.
process.env.RATE_LIMIT_MAX = "2";
process.env.RATE_LIMIT_WINDOW_MS = "60000";

describe("Gateway rate limiting", () => {
  it("returns 429 once a client exceeds the configured request limit", async () => {
    const { buildServer } = await import("../src/server.js");
    const { FakeUpstreamClient } = await import("./fakes/FakeUpstreamClient.js");

    const app = await buildServer({
      upstreamClient: new FakeUpstreamClient({ status: 200, contentType: "application/json", body: Buffer.from("{}") }),
    });

    await app.inject({ method: "GET", url: "/health" });
    await app.inject({ method: "GET", url: "/health" });
    const third = await app.inject({ method: "GET", url: "/health" });

    expect(third.statusCode).toBe(429);
  });
});
