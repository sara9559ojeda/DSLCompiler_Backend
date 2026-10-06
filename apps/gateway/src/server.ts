import Fastify, { type FastifyInstance } from "fastify";
import { errorHandlerPlugin } from "./plugins/errorHandlerPlugin.js";
import { corsPlugin } from "./plugins/corsPlugin.js";
import { rateLimitPlugin } from "./plugins/rateLimitPlugin.js";
import { authPlugin } from "./plugins/authPlugin.js";
import { registerProxyRoutes } from "./routes/registerProxyRoutes.js";
import type { IUpstreamClient } from "./proxy/IUpstreamClient.js";
import { FetchUpstreamClient } from "./proxy/FetchUpstreamClient.js";

export interface BuildServerOptions {
  /** Injected in tests to avoid depending on a live compiler/AI service (DIP). */
  readonly upstreamClient?: IUpstreamClient;
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(errorHandlerPlugin);
  await fastify.register(corsPlugin);
  await fastify.register(rateLimitPlugin);
  await fastify.register(authPlugin);

  fastify.get("/health", async () => ({ status: "ok" }));

  registerProxyRoutes(fastify, options.upstreamClient ?? new FetchUpstreamClient());

  return fastify;
}
