import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  grpc,
  loadContracts,
  GRPC_CHANNEL_OPTIONS,
  type CompilerServiceClient,
  type ExportServiceClient,
} from "@compiler-img/grpc-contracts";
import { buildGrpcServer, startGrpcServer } from "../src/grpc/server.js";

/** Contract tests: a real gRPC server on an ephemeral port, called through the generated client types. */
describe("Compiler gRPC server (v1 contract)", () => {
  let server: grpc.Server;
  let compiler: CompilerServiceClient;
  let exporter: ExportServiceClient;

  beforeAll(async () => {
    server = buildGrpcServer();
    const port = await startGrpcServer(server, "127.0.0.1", 0);
    const contracts = loadContracts();
    const address = `127.0.0.1:${port}`;
    const credentials = grpc.credentials.createInsecure();
    compiler = new contracts.compiler.CompilerService(address, credentials, GRPC_CHANNEL_OPTIONS);
    exporter = new contracts.export.ExportService(address, credentials, GRPC_CHANNEL_OPTIONS);
  });

  afterAll(() => {
    compiler.close();
    exporter.close();
    server.forceShutdown();
  });

  /** Promisifies a generated unary method while keeping its `this`. */
  function call<Req, Res>(
    client: grpc.Client,
    method: (req: Req, cb: (err: grpc.ServiceError | null, res?: Res) => void) => unknown,
    request: Req,
  ): Promise<Res> {
    return new Promise((resolve, reject) => {
      method.call(client, request, (error, response) => (error ? reject(error) : resolve(response as Res)));
    });
  }

  it("Compile returns an SVG for a valid program", async () => {
    const response = await call(compiler, compiler.Compile, { source: "c1 = crear_circulo(radio=10, x=0, y=0);" });
    expect(response.success).toBe(true);
    expect(response.svg).toContain("<circle");
    expect(response.diagnostics).toEqual([]);
  });

  it("Compile reports DSL errors as diagnostics, not as a gRPC error", async () => {
    const response = await call(compiler, compiler.Compile, { source: "crear_circulo(x=0, y=0);" });
    expect(response.success).toBe(false);
    expect(response.svg).toBeUndefined();
    expect(response.diagnostics[0]).toMatchObject({
      severity: "SEVERITY_ERROR",
      code: "SEM-009",
      suggestion: "Agrega radio=50 dentro de los paréntesis.",
      snippet: "crear_circulo(x=0, y=0);",
      position: { line: expect.any(Number), column: expect.any(Number) },
    });
  });

  it("Compile rejects an empty source with INVALID_ARGUMENT", async () => {
    await expect(call(compiler, compiler.Compile, { source: "" })).rejects.toMatchObject({
      code: grpc.status.INVALID_ARGUMENT,
    });
  });

  it("Analyze returns diagnostics without generating SVG", async () => {
    const response = await call(compiler, compiler.Analyze, { source: "c1 = crear_circulo(radio=10, x=0, y=0);" });
    expect(response).toEqual({ success: true, diagnostics: [] });
  });

  it("GetCompilationStages returns tokens, AST, IR, SVG and per-stage timings", async () => {
    const response = await call(compiler, compiler.GetCompilationStages, {
      source: "c1 = crear_circulo(radio=10, x=0, y=0);",
    });
    expect(response.success).toBe(true);
    expect(response.tokens.at(-1)?.type).toBe("EOF");
    expect(JSON.parse(response.astJson).node).toBe("ProgramNode");
    expect(JSON.parse(response.sceneJson).shapes).toHaveLength(1);
    expect(response.svg).toContain("<svg");
    expect(response.timings.map((timing) => timing.stage)).toEqual(["lexer", "parser", "semantic", "optimizer", "codegen"]);
    expect(response.optimization.map((report) => report.pass)).toEqual([
      "remove-degenerate",
      "remove-off-canvas",
      "remove-occluded",
    ]);
    expect(JSON.parse(response.optimizedSceneJson).shapes).toHaveLength(1);
  });

  it("Export returns PNG bytes", async () => {
    const response = await call(exporter, exporter.Export, {
      source: "c1 = crear_circulo(radio=10, x=0, y=0);",
      format: "EXPORT_FORMAT_PNG",
    });
    expect(response.success).toBe(true);
    expect(response.contentType).toBe("image/png");
    expect(response.content.subarray(1, 4).toString()).toBe("PNG");
  });

  it("Export answers success=false with diagnostics for a program that fails to compile", async () => {
    const response = await call(exporter, exporter.Export, {
      source: "crear_circulo(x=0, y=0);",
      format: "EXPORT_FORMAT_SVG",
    });
    expect(response.success).toBe(false);
    expect(response.content).toHaveLength(0);
    expect(response.diagnostics.length).toBeGreaterThan(0);
  });

  it("Export rejects an unspecified format with INVALID_ARGUMENT", async () => {
    await expect(
      call(exporter, exporter.Export, { source: "c1 = crear_circulo(radio=10, x=0, y=0);" }),
    ).rejects.toMatchObject({ code: grpc.status.INVALID_ARGUMENT });
  });

  it("GetSupportedFormats lists SVG and PNG", async () => {
    const response = await call(exporter, exporter.GetSupportedFormats, {});
    expect(response.formats).toEqual([
      { format: "EXPORT_FORMAT_SVG", contentType: "image/svg+xml" },
      { format: "EXPORT_FORMAT_PNG", contentType: "image/png" },
    ]);
  });
});
