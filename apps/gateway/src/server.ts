import Fastify, { type FastifyInstance } from "fastify";
import { errorHandlerPlugin } from "./plugins/errorHandlerPlugin.js";
import { corsPlugin } from "./plugins/corsPlugin.js";
import { rateLimitPlugin } from "./plugins/rateLimitPlugin.js";
import { authPlugin } from "./plugins/authPlugin.js";
import { registerProxyRoutes } from "./routes/registerProxyRoutes.js";
import type { IUpstreamClient } from "./proxy/IUpstreamClient.js";
import { FetchUpstreamClient } from "./proxy/FetchUpstreamClient.js";
import { GrpcCompilerUpstreamClient } from "./proxy/GrpcCompilerUpstreamClient.js";
import { TargetRoutingUpstreamClient } from "./proxy/TargetRoutingUpstreamClient.js";
import { COMPILER_GRPC_ADDRESS, COMPILER_TRANSPORT, GRPC_DEADLINE_MS } from "./config/gateway.config.js";

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

  registerProxyRoutes(fastify, options.upstreamClient ?? createUpstreamClient(fastify));

  return fastify;
}

/** Composition root for the real transports: fetch for everything, gRPC for the compiler when configured. */
function createUpstreamClient(fastify: FastifyInstance): IUpstreamClient {
  const fetchClient = new FetchUpstreamClient();
  if (COMPILER_TRANSPORT !== "grpc") {
    return fetchClient;
  }

  const grpcClient = new GrpcCompilerUpstreamClient(COMPILER_GRPC_ADDRESS, GRPC_DEADLINE_MS);
  fastify.addHook("onClose", async () => grpcClient.close());
  return new TargetRoutingUpstreamClient({ compiler: grpcClient }, fetchClient);
}
