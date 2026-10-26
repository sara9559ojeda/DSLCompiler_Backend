import Fastify, { type FastifyInstance } from "fastify";
import {
  CompileRequestSchema,
  ExportRequestSchema,
  type CompileRequestBody,
  type ExportRequestBody,
} from "@compiler-img/shared";
import { CompilerApplication } from "../application/CompilerApplication.js";

/**
 * HTTP adapter over CompilerApplication. All compile/export logic lives in
 * the application layer, shared with the gRPC adapter (src/grpc/server.ts).
 */
export function buildServer(app: CompilerApplication = new CompilerApplication()): FastifyInstance {
  const fastify = Fastify({ logger: false });

  fastify.get("/health", async () => ({ status: "ok" }));

  fastify.post<{ Body: CompileRequestBody }>(
    "/compile",
    { schema: { body: CompileRequestSchema } },
    async (request, reply) => reply.send(app.compile(request.body.source)),
  );

  fastify.post<{ Body: CompileRequestBody }>(
    "/stages",
    { schema: { body: CompileRequestSchema } },
    async (request, reply) => reply.send(app.stages(request.body.source)),
  );

  fastify.post<{ Body: ExportRequestBody }>(
    "/export",
    { schema: { body: ExportRequestSchema } },
    async (request, reply) => {
      const outcome = await app.export(request.body.source, request.body.format);

      if (!outcome.success) {
        return reply.status(422).send({ success: false, diagnostics: outcome.diagnostics });
      }

      reply.header("content-type", outcome.contentType);
      return reply.send(outcome.content);
    },
  );

  return fastify;
}
