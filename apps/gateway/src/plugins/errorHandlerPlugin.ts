import fp from "fastify-plugin";
import type { FastifyError, FastifyInstance } from "fastify";

/** Every error and 404 leaves the gateway in the same { error: { message, statusCode } } shape. */
export const errorHandlerPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({ error: { message: error.message, statusCode } });
  });

  fastify.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: { message: "Ruta no encontrada.", statusCode: 404 } });
  });
});
