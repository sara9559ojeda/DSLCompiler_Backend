import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { errorHandlerPlugin, INTERNAL_ERROR_MESSAGE } from "../src/plugins/errorHandlerPlugin.js";
import { FetchUpstreamClient, UPSTREAM_UNAVAILABLE_MESSAGE } from "../src/proxy/FetchUpstreamClient.js";
import type { UpstreamRequest } from "../src/proxy/IUpstreamClient.js";

async function appThrowing(error: Error & { statusCode?: number }) {
  const app = Fastify();
  await app.register(errorHandlerPlugin);
  app.get("/boom", async () => {
    throw error;
  });
  return app;
}

describe("errorHandlerPlugin", () => {
  it("masks the message of a server error", async () => {
    const app = await appThrowing(new Error("connect ECONNREFUSED 10.0.0.3:4001"));
    const response = await app.inject({ method: "GET", url: "/boom" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: { message: INTERNAL_ERROR_MESSAGE, statusCode: 500 } });
  });

  it("keeps the message of a client error", async () => {
    const app = await appThrowing(Object.assign(new Error("Falta el campo 'source'."), { statusCode: 400 }));
    const response = await app.inject({ method: "GET", url: "/boom" });

    expect(response.json()).toEqual({ error: { message: "Falta el campo 'source'.", statusCode: 400 } });
  });

  it("answers unknown routes with a 404 in the same shape", async () => {
    const app = await appThrowing(new Error("unused"));
    const response = await app.inject({ method: "GET", url: "/nope" });

    expect(response.json()).toEqual({ error: { message: "Ruta no encontrada.", statusCode: 404 } });
  });
});

describe("FetchUpstreamClient", () => {
  const request: UpstreamRequest = { target: "ai", baseUrl: "http://ai.internal", path: "/assist", method: "POST", body: { a: 1 } };

  it("turns an unreachable upstream into a 503 instead of throwing", async () => {
    const failingFetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;

    const response = await new FetchUpstreamClient(failingFetch).forward(request);

    expect(response.status).toBe(503);
    expect(JSON.parse(response.body.toString())).toEqual({ error: { message: UPSTREAM_UNAVAILABLE_MESSAGE, statusCode: 503 } });
  });

  it("relays status, content type and body from the upstream", async () => {
    let seen: { url: string; init: RequestInit | undefined } | undefined;
    const fakeFetch = (async (url: URL, init?: RequestInit) => {
      seen = { url: url.toString(), init };
      return new Response("png-bytes", { status: 201, headers: { "content-type": "image/png" } });
    }) as typeof fetch;

    const response = await new FetchUpstreamClient(fakeFetch).forward(request);

    expect(response.status).toBe(201);
    expect(response.contentType).toBe("image/png");
    expect(response.body.toString()).toBe("png-bytes");
    expect(seen?.url).toBe("http://ai.internal/assist");
    expect(seen?.init?.body).toBe(JSON.stringify({ a: 1 }));
    expect((seen?.init?.headers as Record<string, string>)["content-type"]).toBe("application/json");
  });

  it("sends no body or content type for a request without one", async () => {
    let init: RequestInit | undefined;
    const fakeFetch = (async (_url: URL, given?: RequestInit) => {
      init = given;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    const response = await new FetchUpstreamClient(fakeFetch).forward({ ...request, method: "GET", body: undefined });

    expect(init?.body).toBeUndefined();
    expect(init?.headers).toEqual({});
    expect(response.contentType).toBe("text/plain;charset=UTF-8");
  });
});
