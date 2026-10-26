import {
  grpc,
  loadContracts,
  GRPC_SERVER_OPTIONS,
  type CompilerServiceHandlers,
  type ExportServiceHandlers,
  type GrpcDiagnostic,
  type GrpcExportFormat,
} from "@compiler-img/grpc-contracts";
import { MAX_SOURCE_LENGTH } from "@compiler-img/shared";
import type { Diagnostic } from "@saramariaojeda9559/compiler-core";
import { CompilerApplication, UnsupportedFormatError } from "../application/CompilerApplication.js";
import type { ExportFormat } from "../export/IExporter.js";

/**
 * gRPC adapter over CompilerApplication — the protobuf mapping lives here
 * and only here. Compile errors in the *DSL* are a normal response
 * (success=false + diagnostics), exactly like the HTTP adapter's 200; gRPC
 * status codes are reserved for problems with the *call* itself.
 */
export function buildGrpcServer(app: CompilerApplication = new CompilerApplication()): grpc.Server {
  const contracts = loadContracts();
  const server = new grpc.Server(GRPC_SERVER_OPTIONS);

  const compilerHandlers: CompilerServiceHandlers = {
    Compile: unary((request) => {
      const source = requireSource(request.source);
      const result = app.compile(source);
      return {
        success: result.success,
        ...(result.svg === null ? {} : { svg: result.svg }),
        diagnostics: result.diagnostics.map(toGrpcDiagnostic),
      };
    }),
    Analyze: unary((request) => {
      const outcome = app.analyze(requireSource(request.source));
      return { success: outcome.success, diagnostics: outcome.diagnostics.map(toGrpcDiagnostic) };
    }),
    GetCompilationStages: unary((request) => {
      const outcome = app.stages(requireSource(request.source));
      return {
        success: outcome.success,
        tokens: [...outcome.tokens],
        astJson: outcome.astJson,
        sceneJson: outcome.sceneJson,
        ...(outcome.svg === null ? {} : { svg: outcome.svg }),
        diagnostics: outcome.diagnostics.map(toGrpcDiagnostic),
        timings: [...outcome.timings],
        optimizedSceneJson: outcome.optimizedSceneJson,
        optimization: [...outcome.optimization],
      };
    }),
  };

  const exportHandlers: ExportServiceHandlers = {
    Export: unary(async (request) => {
      const outcome = await app.export(requireSource(request.source), fromGrpcFormat(request.format));
      return outcome.success
        ? { success: true, content: outcome.content, contentType: outcome.contentType, diagnostics: [] }
        : { success: false, diagnostics: outcome.diagnostics.map(toGrpcDiagnostic) };
    }),
    GetSupportedFormats: unary(() => ({
      formats: app.supportedFormats().map(({ format, contentType }) => ({ format: toGrpcFormat(format), contentType })),
    })),
  };

  server.addService(contracts.compiler.CompilerService.service, compilerHandlers);
  server.addService(contracts.export.ExportService.service, exportHandlers);
  return server;
}

/** Binds and resolves with the actual port (useful with port 0 in tests). */
export function startGrpcServer(server: grpc.Server, host: string, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    server.bindAsync(`${host}:${port}`, grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
      if (error) reject(error);
      else resolve(boundPort);
    });
  });
}

/** Thrown by handlers to answer with a specific gRPC status instead of INTERNAL. */
class RpcError extends Error {
  constructor(
    readonly code: grpc.status,
    message: string,
  ) {
    super(message);
  }
}

function unary<Req, Res>(
  handle: (request: Req) => Res | Promise<Res>,
): grpc.handleUnaryCall<Req, Res> {
  return (call, callback) => {
    Promise.resolve()
      .then(() => handle(call.request))
      .then(
        (response) => callback(null, response),
        (error: unknown) => {
          if (error instanceof RpcError) {
            callback({ code: error.code, details: error.message });
          } else if (error instanceof UnsupportedFormatError) {
            callback({ code: grpc.status.INVALID_ARGUMENT, details: error.message });
          } else {
            callback({ code: grpc.status.INTERNAL, details: "Error interno del compilador." });
          }
        },
      );
  };
}

function requireSource(source: string): string {
  if (source.length === 0) {
    throw new RpcError(grpc.status.INVALID_ARGUMENT, "El campo 'source' no puede estar vacío.");
  }
  if (source.length > MAX_SOURCE_LENGTH) {
    throw new RpcError(grpc.status.INVALID_ARGUMENT, `El código supera el máximo de ${MAX_SOURCE_LENGTH} caracteres.`);
  }
  return source;
}

function toGrpcDiagnostic(diagnostic: Diagnostic): GrpcDiagnostic {
  return {
    severity: diagnostic.severity === "error" ? "SEVERITY_ERROR" : "SEVERITY_WARNING",
    message: diagnostic.message,
    position: diagnostic.position,
    code: diagnostic.code,
    ...(diagnostic.suggestion === undefined ? {} : { suggestion: diagnostic.suggestion }),
    ...(diagnostic.snippet === undefined ? {} : { snippet: diagnostic.snippet }),
  };
}

const FORMAT_TO_GRPC: Readonly<Record<ExportFormat, GrpcExportFormat>> = {
  svg: "EXPORT_FORMAT_SVG",
  png: "EXPORT_FORMAT_PNG",
};

function toGrpcFormat(format: ExportFormat): GrpcExportFormat {
  return FORMAT_TO_GRPC[format];
}

function fromGrpcFormat(format: GrpcExportFormat | number): ExportFormat {
  const match = (Object.keys(FORMAT_TO_GRPC) as ExportFormat[]).find((key) => FORMAT_TO_GRPC[key] === format);
  if (!match) {
    throw new RpcError(grpc.status.INVALID_ARGUMENT, "Formato de exportación no especificado o no soportado.");
  }
  return match;
}
