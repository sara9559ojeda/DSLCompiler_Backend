import type { FastifyError, FastifyInstance } from "fastify";

const GENERIC_MESSAGE = "No se pudo completar la solicitud de IA en este momento.";

/**
 * Matches the gateway's { error: { message, statusCode } } shape. Schema
 * validation errors (400) keep their specific message; anything else
 * (typically the Anthropic SDK surfacing a missing/invalid API key, a rate
 * limit, a network failure) is masked with a generic message instead of
 * leaking SDK-internal details to the caller.
 */
export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.validation ? 400 : (error.statusCode ?? 500);
    const message = error.validation ? error.message : statusCode < 500 ? error.message : GENERIC_MESSAGE;
    reply.status(statusCode).send({ error: { message, statusCode } });
  });
}
