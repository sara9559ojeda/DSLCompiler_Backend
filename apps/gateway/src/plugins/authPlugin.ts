import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { JWT_SECRET } from "../config/gateway.config.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Registers JWT support and decorates `fastify.authenticate` as a
 * preHandler any route can opt into via `requiresAuth` in routes.config.ts.
 * No route uses it yet (compile/export are intentionally anonymous — see
 * the architecture doc's security section) but the mechanism is wired and
 * tested for when the Projects service (phase 4) needs protected routes.
 */
export const authPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(jwt, { secret: JWT_SECRET });

  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: { message: "No autorizado.", statusCode: 401 } });
    }
  });
});
