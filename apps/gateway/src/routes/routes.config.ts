import {
  CompileRequestSchema,
  ExportRequestSchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  SuggestRequestSchema,
  ExplainErrorRequestSchema,
} from "@compiler-img/shared";
import type { UpstreamTarget } from "../config/gateway.config.js";
import type { UpstreamMethod } from "../proxy/IUpstreamClient.js";

export interface ProxyRouteConfig {
  readonly method: UpstreamMethod;
  /** Gateway-facing path. Fastify `:param` syntax is supported. */
  readonly path: string;
  /** Upstream path template — `:param` names must match `path`'s. */
  readonly upstreamPath: string;
  readonly target: UpstreamTarget;
  /** When true, `fastify.authenticate` runs first and the verified user id is forwarded as `x-user-id`. */
  readonly requiresAuth: boolean;
  readonly bodySchema?: object;
}

/**
 * The gateway's entire public surface. Adding a route to a new (or existing)
 * upstream service is adding an entry here — registerProxyRoutes.ts never
 * changes (Open/Closed).
 */
export const ROUTES: readonly ProxyRouteConfig[] = [
  {
    method: "POST",
    path: "/api/compile",
    upstreamPath: "/compile",
    target: "compiler",
    requiresAuth: false,
    bodySchema: CompileRequestSchema,
  },
  {
    method: "POST",
    path: "/api/export",
    upstreamPath: "/export",
    target: "compiler",
    requiresAuth: false,
    bodySchema: ExportRequestSchema,
  },
  {
    method: "POST",
    path: "/api/auth/register",
    upstreamPath: "/auth/register",
    target: "projects",
    requiresAuth: false,
    bodySchema: RegisterRequestSchema,
  },
  {
    method: "POST",
    path: "/api/auth/login",
    upstreamPath: "/auth/login",
    target: "projects",
    requiresAuth: false,
    bodySchema: LoginRequestSchema,
  },
  {
    method: "GET",
    path: "/api/projects",
    upstreamPath: "/projects",
    target: "projects",
    requiresAuth: true,
  },
  {
    method: "POST",
    path: "/api/projects",
    upstreamPath: "/projects",
    target: "projects",
    requiresAuth: true,
    bodySchema: CreateProjectRequestSchema,
  },
  {
    method: "GET",
    path: "/api/projects/:id",
    upstreamPath: "/projects/:id",
    target: "projects",
    requiresAuth: true,
  },
  {
    method: "PUT",
    path: "/api/projects/:id",
    upstreamPath: "/projects/:id",
    target: "projects",
    requiresAuth: true,
    bodySchema: UpdateProjectRequestSchema,
  },
  {
    method: "DELETE",
    path: "/api/projects/:id",
    upstreamPath: "/projects/:id",
    target: "projects",
    requiresAuth: true,
  },
  {
    method: "POST",
    path: "/api/ai/suggest",
    upstreamPath: "/suggest",
    target: "ai",
    requiresAuth: false,
    bodySchema: SuggestRequestSchema,
  },
  {
    method: "POST",
    path: "/api/ai/explain-error",
    upstreamPath: "/explain-error",
    target: "ai",
    requiresAuth: false,
    bodySchema: ExplainErrorRequestSchema,
  },
];
