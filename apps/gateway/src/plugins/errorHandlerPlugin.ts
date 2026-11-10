import fp from "fastify-plugin";
import type { FastifyError, FastifyInstance } from "fastify";

export const INTERNAL_ERROR_MESSAGE = "Ocurrió un error interno. Inténtalo de nuevo.";

/**
 * Every error and 404 leaves the gateway in the same { error: { message, statusCode } } shape.
 * Client errors (4xx) keep their message; server errors are masked and logged, so library
 * internals never reach the browser.
 */
export const errorHandlerPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) request.log.error(error);
    const message = statusCode >= 500 ? INTERNAL_ERROR_MESSAGE : error.message;
    reply.status(statusCode).send({ error: { message, statusCode } });
  });

  fastify.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: { message: "Ruta no encontrada.", statusCode: 404 } });
  });
});
