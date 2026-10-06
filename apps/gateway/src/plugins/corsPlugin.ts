import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { CORS_ORIGIN } from "../config/gateway.config.js";

export const corsPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(cors, { origin: CORS_ORIGIN });
});
