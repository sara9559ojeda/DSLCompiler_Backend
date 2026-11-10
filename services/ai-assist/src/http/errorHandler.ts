import type { FastifyError, FastifyInstance } from "fastify";
import { isPublicServiceError } from "../errors/PublicServiceError.js";

const GENERIC_MESSAGE = "No se pudo completar la solicitud de IA en este momento.";

/**
 * Matches the gateway's { error: { message, statusCode } } shape. Schema
 * validation errors (400) keep their specific message; anything else
 * (typically the Anthropic SDK surfacing a missing/invalid API key, a rate
 * limit, a network failure) is masked with a generic message instead of
 * leaking SDK-internal details to the caller. A PublicServiceError is the
 * exception: its message was written for the user, so it is kept.
 */
export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    if (isPublicServiceError(error)) {
      reply.status(error.statusCode).send({ error: { message: error.message, statusCode: error.statusCode } });
      return;
    }
    const statusCode = error.validation ? 400 : (error.statusCode ?? 500);
    const message = error.validation ? error.message : statusCode < 500 ? error.message : GENERIC_MESSAGE;
    reply.status(statusCode).send({ error: { message, statusCode } });
  });
}
