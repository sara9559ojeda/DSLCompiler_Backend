import type { FastifyInstance } from "fastify";
import { AssistRequestSchema, type AssistRequestBody } from "@compiler-img/shared";
import type { AssistService } from "../assist/AssistService.js";

export interface AssistRouteDeps {
  readonly assistService: AssistService;
}

export function registerAssistRoute(fastify: FastifyInstance, deps: AssistRouteDeps): void {
  fastify.post<{ Body: AssistRequestBody }>("/assist", { schema: { body: AssistRequestSchema } }, async (request, reply) => {
    // If the client gives up (the user pressed "Cancelar" or closed the tab), stop paying for the model.
    const controller = new AbortController();
    reply.raw.on("close", () => {
      if (!reply.raw.writableFinished) controller.abort();
    });

    const result = await deps.assistService.assist(request.body, controller.signal);
    return reply.send(result);
  });
}
