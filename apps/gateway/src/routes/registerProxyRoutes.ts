import type { FastifyInstance } from "fastify";
import { USER_ID_HEADER } from "@compiler-img/shared";
import { UPSTREAM_TARGETS } from "../config/gateway.config.js";
import type { IUpstreamClient } from "../proxy/IUpstreamClient.js";
import { ROUTES } from "./routes.config.js";
import { resolveUpstreamPath } from "./resolveUpstreamPath.js";

/** Generic proxy handler: every route in ROUTES is registered the same way, regardless of upstream. */
export function registerProxyRoutes(fastify: FastifyInstance, upstreamClient: IUpstreamClient): void {
  for (const route of ROUTES) {
    fastify.route({
      method: route.method,
      url: route.path,
      schema: route.bodySchema ? { body: route.bodySchema } : undefined,
      preHandler: route.requiresAuth ? [fastify.authenticate] : [],
      handler: async (request, reply) => {
        const headers: Record<string, string> = {};
        if (route.requiresAuth) {
          headers[USER_ID_HEADER] = (request.user as { sub: string }).sub;
        }

        const upstreamResponse = await upstreamClient.forward({
          baseUrl: UPSTREAM_TARGETS[route.target],
          path: resolveUpstreamPath(route.upstreamPath, request.params as Record<string, string>),
          method: route.method,
          body: request.body,
          headers,
        });

        reply.status(upstreamResponse.status);
        reply.header("content-type", upstreamResponse.contentType);
        return reply.send(upstreamResponse.body);
      },
    });
  }
}
