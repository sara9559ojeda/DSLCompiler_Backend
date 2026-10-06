import type { FastifyInstance } from "fastify";
import { SuggestRequestSchema, type SuggestRequestBody } from "@compiler-img/shared";
import type { SuggestionService } from "../suggestion/SuggestionService.js";

export interface SuggestRouteDeps {
  readonly suggestionService: SuggestionService;
}

export function registerSuggestRoute(fastify: FastifyInstance, deps: SuggestRouteDeps): void {
  fastify.post<{ Body: SuggestRequestBody }>(
    "/suggest",
    { schema: { body: SuggestRequestSchema } },
    async (request, reply) => {
      const result = await deps.suggestionService.suggest(request.body.prompt);
      return reply.send(result);
    },
  );
}
