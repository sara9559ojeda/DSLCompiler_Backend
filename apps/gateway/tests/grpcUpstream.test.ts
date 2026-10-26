import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { grpc } from "@compiler-img/grpc-contracts";
import { buildGrpcServer, startGrpcServer } from "@compiler-img/compiler";
import { buildServer } from "../src/server.js";
import { GrpcCompilerUpstreamClient } from "../src/proxy/GrpcCompilerUpstreamClient.js";
import { TargetRoutingUpstreamClient } from "../src/proxy/TargetRoutingUpstreamClient.js";
import { FakeUpstreamClient } from "./fakes/FakeUpstreamClient.js";

/**
 * End to end over a real gRPC hop: public HTTP request → gateway →
 * GrpcCompilerUpstreamClient → compiler's gRPC server. The responses must
 * be indistinguishable from the HTTP transport's.
 */
describe("Gateway → compiler over gRPC", () => {
  let compilerServer: grpc.Server;
  let grpcClient: GrpcCompilerUpstreamClient;
  let gateway: FastifyInstance;
  const fallback = new FakeUpstreamClient({ status: 200, contentType: "application/json", body: Buffer.from("{}") });

  beforeAll(async () => {
    compilerServer = buildGrpcServer();
    const port = await startGrpcServer(compilerServer, "127.0.0.1", 0);
    grpcClient = new GrpcCompilerUpstreamClient(`127.0.0.1:${port}`, 5_000);
    gateway = await buildServer({
      upstreamClient: new TargetRoutingUpstreamClient({ compiler: grpcClient }, fallback),
    });
  });

  afterAll(async () => {
    await gateway.close();
    grpcClient.close();
    compilerServer.forceShutdown();
  });

  it("POST /api/compile returns the same JSON shape as the HTTP transport", async () => {
    const response = await gateway.inject({
      method: "POST",
      url: "/api/compile",
      payload: { source: "c1 = crear_circulo(radio=10, x=0, y=0);" },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({ success: true, diagnostics: [] });
    expect(body.svg).toContain("<circle");
  });

  it("POST /api/compile maps diagnostics back to { severity, message, position }", async () => {
    const response = await gateway.inject({
      method: "POST",
      url: "/api/compile",
      payload: { source: "crear_circulo(x=0, y=0);" },
    });
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.svg).toBeNull();
    expect(body.diagnostics[0]).toMatchObject({
      severity: "error",
      code: "SEM-009",
      suggestion: "Agrega radio=50 dentro de los paréntesis.",
      snippet: "crear_circulo(x=0, y=0);",
      position: { line: 1 },
    });
  });

  it("POST /api/compile/stages returns tokens, AST, IR and timings", async () => {
    const response = await gateway.inject({
      method: "POST",
      url: "/api/compile/stages",
      payload: { source: "c1 = crear_circulo(radio=10, x=0, y=0);" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().timings).toHaveLength(5);
  });

  it("POST /api/export streams PNG bytes with the right content type", async () => {
    const response = await gateway.inject({
      method: "POST",
      url: "/api/export",
      payload: { source: "c1 = crear_circulo(radio=10, x=0, y=0);", format: "png" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.rawPayload.subarray(1, 4).toString()).toBe("PNG");
  });

  it("POST /api/export answers 422 with diagnostics for a broken program", async () => {
    const response = await gateway.inject({
      method: "POST",
      url: "/api/export",
      payload: { source: "crear_circulo(x=0, y=0);", format: "svg" },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().diagnostics.length).toBeGreaterThan(0);
  });

  it("non-compiler targets still go through the fallback transport", async () => {
    await gateway.inject({ method: "POST", url: "/api/ai/suggest", payload: { prompt: "un gato" } });
    expect(fallback.lastRequest?.target).toBe("ai");
  });

  it("an unreachable compiler becomes 503 instead of crashing the gateway", async () => {
    const offline = new GrpcCompilerUpstreamClient("127.0.0.1:1", 1_000);
    const response = await offline.forward({
      target: "compiler",
      baseUrl: "",
      path: "/compile",
      method: "POST",
      body: { source: "c1 = crear_circulo(radio=10, x=0, y=0);" },
    });
    offline.close();
    expect([503, 504]).toContain(response.status);
    expect(JSON.parse(response.body.toString()).error.statusCode).toBe(response.status);
  });
});
