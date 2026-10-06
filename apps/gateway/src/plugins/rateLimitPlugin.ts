import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "../config/gateway.config.js";

export const rateLimitPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(rateLimit, {
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_WINDOW_MS,
  });
});
