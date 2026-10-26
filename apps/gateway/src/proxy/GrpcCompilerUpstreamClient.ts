import {
  grpc,
  loadContracts,
  GRPC_CHANNEL_OPTIONS,
  type CompilerServiceClient,
  type ExportServiceClient,
  type GrpcDiagnosticOutput,
  type CompileResponse__Output,
  type CompilationStagesResponse__Output,
  type ExportResponse__Output,
} from "@compiler-img/grpc-contracts";
import type { IUpstreamClient, UpstreamRequest, UpstreamResponse } from "./IUpstreamClient.js";

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

/**
 * IUpstreamClient adapter that reaches the compiler service over gRPC
 * (CompilerService/ExportService v1) instead of HTTP. It answers with the
 * exact same HTTP-shaped responses the compiler's HTTP API gives, so the
 * public /api/* contract — and the frontend — can't tell which transport
 * is in use.
 *
 * gRPC status codes become HTTP statuses (INVALID_ARGUMENT → 400,
 * DEADLINE_EXCEEDED → 504, UNAVAILABLE → 503, anything else → 502).
 */
export class GrpcCompilerUpstreamClient implements IUpstreamClient {
  private readonly compiler: CompilerServiceClient;
  private readonly exporter: ExportServiceClient;

  constructor(
    address: string,
    private readonly deadlineMs: number,
  ) {
    const contracts = loadContracts();
    const credentials = grpc.credentials.createInsecure();
    this.compiler = new contracts.compiler.CompilerService(address, credentials, GRPC_CHANNEL_OPTIONS);
    this.exporter = new contracts.export.ExportService(address, credentials, GRPC_CHANNEL_OPTIONS);
  }

  async forward({ path, body }: UpstreamRequest): Promise<UpstreamResponse> {
    try {
      return await this.dispatch(path, body as Record<string, string>);
    } catch (error) {
      return grpcErrorToResponse(error);
    }
  }

  close(): void {
    this.compiler.close();
    this.exporter.close();
  }

  private async dispatch(path: string, body: Record<string, string>): Promise<UpstreamResponse> {
    const source = body.source ?? "";

    switch (path) {
      case "/compile": {
        const response = await this.call<CompileResponse__Output>((options, callback) =>
          this.compiler.Compile({ source }, options, callback),
        );
        return json(200, {
          success: response.success,
          svg: response.svg ?? null,
          diagnostics: response.diagnostics.map(fromGrpcDiagnostic),
        });
      }
      case "/stages": {
        const response = await this.call<CompilationStagesResponse__Output>((options, callback) =>
          this.compiler.GetCompilationStages({ source }, options, callback),
        );
        return json(200, {
          success: response.success,
          tokens: response.tokens,
          astJson: response.astJson,
          sceneJson: response.sceneJson,
          svg: response.svg ?? null,
          diagnostics: response.diagnostics.map(fromGrpcDiagnostic),
          timings: response.timings,
          optimizedSceneJson: response.optimizedSceneJson,
          optimization: response.optimization,
        });
      }
      case "/export": {
        const format = body.format === "png" ? "EXPORT_FORMAT_PNG" : "EXPORT_FORMAT_SVG";
        const response = await this.call<ExportResponse__Output>((options, callback) =>
          this.exporter.Export({ source, format }, options, callback),
        );
        if (!response.success) {
          return json(422, { success: false, diagnostics: response.diagnostics.map(fromGrpcDiagnostic) });
        }
        return { status: 200, contentType: response.contentType, body: response.content };
      }
      default:
        return json(404, { error: { message: "Ruta no encontrada.", statusCode: 404 } });
    }
  }

  /** Promisifies one unary call, applying the per-call deadline. */
  private call<Res>(invoke: (options: grpc.CallOptions, callback: grpc.requestCallback<Res>) => unknown): Promise<Res> {
    const deadline = new Date(Date.now() + this.deadlineMs);
    return new Promise((resolve, reject) => {
      invoke({ deadline }, (error, response) => (error ? reject(error) : resolve(response as Res)));
    });
  }
}

function fromGrpcDiagnostic(diagnostic: GrpcDiagnosticOutput) {
  return {
    severity: diagnostic.severity === "SEVERITY_WARNING" ? "warning" : "error",
    code: diagnostic.code,
    message: diagnostic.message,
    position: diagnostic.position ?? { line: 0, column: 0 },
    ...(diagnostic.suggestion === undefined ? {} : { suggestion: diagnostic.suggestion }),
    ...(diagnostic.snippet === undefined ? {} : { snippet: diagnostic.snippet }),
  };
}

const STATUS_TO_HTTP: Partial<Record<grpc.status, number>> = {
  [grpc.status.INVALID_ARGUMENT]: 400,
  [grpc.status.DEADLINE_EXCEEDED]: 504,
  [grpc.status.UNAVAILABLE]: 503,
};

function grpcErrorToResponse(error: unknown): UpstreamResponse {
  const serviceError = error as Partial<grpc.ServiceError>;
  const statusCode = (serviceError.code !== undefined && STATUS_TO_HTTP[serviceError.code]) || 502;
  const message =
    statusCode === 400 && serviceError.details ? serviceError.details : "El servicio de compilación no respondió correctamente.";
  return json(statusCode, { error: { message, statusCode } });
}

function json(status: number, payload: unknown): UpstreamResponse {
  return { status, contentType: JSON_CONTENT_TYPE, body: Buffer.from(JSON.stringify(payload)) };
}
