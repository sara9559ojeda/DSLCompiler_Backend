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
