import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { CORS_ORIGINS } from "../config/gateway.config.js";
import type { CorsOriginOption } from "../config/corsOrigins.js";

export interface CorsPluginOptions {
  /** Tests inject their own allow-list; production reads CORS_ORIGIN. */
  readonly origins?: CorsOriginOption;
}

export const corsPlugin = fp(async (fastify: FastifyInstance, options: CorsPluginOptions) => {
  const origins = options.origins ?? CORS_ORIGINS;
  await fastify.register(cors, { origin: origins === true ? true : [...origins] });
});
