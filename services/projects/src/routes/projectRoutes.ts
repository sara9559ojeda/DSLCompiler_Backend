import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  type CreateProjectRequestBody,
  type UpdateProjectRequestBody,
} from "@compiler-img/shared";
import type { IProjectRepository } from "../repositories/IProjectRepository.js";
import { USER_ID_HEADER } from "../config/projects.config.js";

export interface ProjectRoutesDeps {
  readonly projectRepository: IProjectRepository;
}

/**
 * These routes trust the `x-user-id` header instead of verifying a JWT
 * themselves — the gateway is the only public entry point and already
 * verified the token before proxying here (see apps/gateway's
 * registerProxyRoutes.ts). Still fails closed if the header is missing,
 * so calling this service directly (bypassing the gateway) never leaks data.
 */
function requireUserId(request: FastifyRequest, reply: FastifyReply): string | null {
  const userId = request.headers[USER_ID_HEADER];
  if (typeof userId !== "string" || userId.length === 0) {
    reply.status(401).send({ error: { message: "No autorizado.", statusCode: 401 } });
    return null;
  }
  return userId;
}

export function registerProjectRoutes(fastify: FastifyInstance, deps: ProjectRoutesDeps): void {
  fastify.get("/projects", async (request, reply) => {
    const userId = requireUserId(request, reply);
    if (!userId) return;
    const projects = await deps.projectRepository.listByOwner(userId);
    return reply.send({ projects });
  });

  fastify.post<{ Body: CreateProjectRequestBody }>(
    "/projects",
    { schema: { body: CreateProjectRequestSchema } },
    async (request, reply) => {
      const userId = requireUserId(request, reply);
      if (!userId) return;
      const project = await deps.projectRepository.create({ ...request.body, ownerId: userId });
      return reply.status(201).send({ project });
    },
  );

  fastify.get<{ Params: { id: string } }>("/projects/:id", async (request, reply) => {
    const userId = requireUserId(request, reply);
    if (!userId) return;
    const project = await deps.projectRepository.findById(request.params.id);
    if (!project || project.ownerId !== userId) {
      return reply.status(404).send({ error: { message: "Proyecto no encontrado.", statusCode: 404 } });
    }
    return reply.send({ project });
  });

  fastify.put<{ Params: { id: string }; Body: UpdateProjectRequestBody }>(
    "/projects/:id",
    { schema: { body: UpdateProjectRequestSchema } },
    async (request, reply) => {
      const userId = requireUserId(request, reply);
      if (!userId) return;
      const existing = await deps.projectRepository.findById(request.params.id);
      if (!existing || existing.ownerId !== userId) {
        return reply.status(404).send({ error: { message: "Proyecto no encontrado.", statusCode: 404 } });
      }
      const updated = await deps.projectRepository.update(request.params.id, request.body);
      return reply.send({ project: updated });
    },
  );

  fastify.delete<{ Params: { id: string } }>("/projects/:id", async (request, reply) => {
    const userId = requireUserId(request, reply);
    if (!userId) return;
    const existing = await deps.projectRepository.findById(request.params.id);
    if (!existing || existing.ownerId !== userId) {
      return reply.status(404).send({ error: { message: "Proyecto no encontrado.", statusCode: 404 } });
    }
    await deps.projectRepository.delete(request.params.id);
    return reply.status(204).send();
  });
}
