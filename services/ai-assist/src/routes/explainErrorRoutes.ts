import type { FastifyInstance } from "fastify";
import { ExplainErrorRequestSchema, type ExplainErrorRequestBody } from "@compiler-img/shared";
import type { ExplainErrorService } from "../explanation/ExplainErrorService.js";

export interface ExplainErrorRouteDeps {
  readonly explainErrorService: ExplainErrorService;
}

export function registerExplainErrorRoute(fastify: FastifyInstance, deps: ExplainErrorRouteDeps): void {
  fastify.post<{ Body: ExplainErrorRequestBody }>(
    "/explain-error",
    { schema: { body: ExplainErrorRequestSchema } },
    async (request, reply) => {
      const { source, diagnostics } = request.body;
      const explanation = await deps.explainErrorService.explain(source, diagnostics);
      return reply.send({ explanation });
    },
  );
}
