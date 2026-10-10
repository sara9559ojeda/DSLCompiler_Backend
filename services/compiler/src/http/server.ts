import Fastify, { type FastifyInstance } from "fastify";
import {
  CompileRequestSchema,
  ExportRequestSchema,
  type CompileRequestBody,
  type ExportRequestBody,
} from "@compiler-img/shared";
import { EXPORT_CONTENT_TYPES } from "../config/http.config.js";
import { createDefaultPipeline } from "../index.js";
import { SvgExporter } from "../export/SvgExporter.js";
import { PngExporter } from "../export/PngExporter.js";
import type { IExporter } from "../export/IExporter.js";

/**
 * Thin HTTP wrapper around CompilerPipeline. Every request builds its own
 * pipeline/exporter instance because SemanticAnalyzer holds per-compile
 * state (symbol table) — nothing here is shared, so there's no cross-request
 * contamination to worry about.
 */
export function buildServer(): FastifyInstance {
  const fastify = Fastify({ logger: false });

  fastify.get("/health", async () => ({ status: "ok" }));

  fastify.post<{ Body: CompileRequestBody }>(
    "/compile",
    { schema: { body: CompileRequestSchema } },
    async (request, reply) => {
      const result = createDefaultPipeline().compile(request.body.source);
      return reply.send(result);
    },
  );

  fastify.post<{ Body: ExportRequestBody }>(
    "/export",
    { schema: { body: ExportRequestSchema } },
    async (request, reply) => {
      const { source, format } = request.body;
      const result = createDefaultPipeline().compile(source);

      if (!result.success || result.svg === null) {
        return reply.status(422).send({ success: false, diagnostics: result.diagnostics });
      }

      const exporter: IExporter = format === "png" ? new PngExporter() : new SvgExporter();
      const buffer = await exporter.export(result.svg);
      reply.header("content-type", EXPORT_CONTENT_TYPES[format]);
      return reply.send(buffer);
    },
  );

  return fastify;
}
