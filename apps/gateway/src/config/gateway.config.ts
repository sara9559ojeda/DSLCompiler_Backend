import "dotenv/config";

/**
 * The gateway's only source of runtime configuration. No upstream URL,
 * secret, or limit is ever written as a literal outside this file.
 */
export const PORT = Number(process.env.PORT ?? 4000);
export const HOST = process.env.HOST ?? "0.0.0.0";

export const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

export const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 100);
export const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);

export type UpstreamTarget = "compiler" | "ai" | "projects";

export const UPSTREAM_TARGETS: Readonly<Record<UpstreamTarget, string>> = Object.freeze({
  compiler: process.env.COMPILER_SERVICE_URL ?? "http://localhost:4001",
  ai: process.env.AI_SERVICE_URL ?? "http://localhost:4002",
  projects: process.env.PROJECTS_SERVICE_URL ?? "http://localhost:4003",
});

/**
 * How the gateway reaches the compiler service. "http" (default) keeps the
 * plain fetch proxy; "grpc" calls CompilerService/ExportService v1 at
 * COMPILER_GRPC_ADDRESS. gRPC needs end-to-end HTTP/2, so it's only usable
 * where the two can talk privately (docker-compose, a private network) —
 * see docs/adr/0012-grpc-between-gateway-and-compiler.md.
 */
export type CompilerTransport = "http" | "grpc";
export const COMPILER_TRANSPORT: CompilerTransport = process.env.COMPILER_TRANSPORT === "grpc" ? "grpc" : "http";
export const COMPILER_GRPC_ADDRESS = process.env.COMPILER_GRPC_ADDRESS ?? "localhost:50051";
/** Per-call deadline; a slow compile/export fails fast with 504 instead of hanging the request. */
export const GRPC_DEADLINE_MS = Number(process.env.GRPC_DEADLINE_MS ?? 5_000);
