import type { FastifyInstance } from "fastify";
import { UPSTREAM_TARGETS } from "../config/gateway.config.js";
import type { IUpstreamClient } from "../proxy/IUpstreamClient.js";
import { ROUTES } from "./routes.config.js";
import { resolveUpstreamPath } from "./resolveUpstreamPath.js";

/**
 * Generic proxy handler: every route in ROUTES is registered the same way,
 * regardless of upstream. For `requiresAuth` routes, the gateway verifies
 * the JWT itself (fast-fail at the edge, via `fastify.authenticate`) *and*
 * forwards the original `Authorization` header so the upstream service can
 * verify it again independently — see
 * docs/adr/0007-public-services-with-self-verified-auth.md for why a single
 * trust boundary isn't safe to assume here.
 */
export function registerProxyRoutes(fastify: FastifyInstance, upstreamClient: IUpstreamClient): void {
  for (const route of ROUTES) {
    fastify.route({
      method: route.method,
      url: route.path,
      schema: route.bodySchema ? { body: route.bodySchema } : undefined,
      preHandler: route.requiresAuth ? [fastify.authenticate] : [],
      handler: async (request, reply) => {
        const headers: Record<string, string> = {};
        if (route.requiresAuth && request.headers.authorization) {
          headers.authorization = request.headers.authorization;
        }

        const upstreamResponse = await upstreamClient.forward({
          target: route.target,
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
