import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  type CreateProjectRequestBody,
  type UpdateProjectRequestBody,
} from "@compiler-img/shared";
import type { IProjectRepository } from "../repositories/IProjectRepository.js";
import type { ITokenService } from "../auth/ITokenService.js";

export interface ProjectRoutesDeps {
  readonly projectRepository: IProjectRepository;
  readonly tokenService: ITokenService;
}

const BEARER_PREFIX = "Bearer ";

/**
 * Verifies the JWT itself (`Authorization: Bearer <token>`) rather than
 * trusting a header set upstream — this service may be reachable directly,
 * not only through the gateway (e.g. on hosting plans without private
 * networking), so it can never assume the caller has already been checked.
 * See docs/adr/0007-public-services-with-self-verified-auth.md.
 */
function requireAuthenticatedUserId(
  request: FastifyRequest,
  reply: FastifyReply,
  tokenService: ITokenService,
): string | null {
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith(BEARER_PREFIX)) {
    reply.status(401).send({ error: { message: "No autorizado.", statusCode: 401 } });
    return null;
  }

  const payload = tokenService.verify(header.slice(BEARER_PREFIX.length));
  if (!payload) {
    reply.status(401).send({ error: { message: "Token inválido o expirado.", statusCode: 401 } });
    return null;
  }

  return payload.sub;
}

export function registerProjectRoutes(fastify: FastifyInstance, deps: ProjectRoutesDeps): void {
  fastify.get("/projects", async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply, deps.tokenService);
    if (!userId) return;
    const projects = await deps.projectRepository.listByOwner(userId);
    return reply.send({ projects });
  });

  fastify.post<{ Body: CreateProjectRequestBody }>(
    "/projects",
    { schema: { body: CreateProjectRequestSchema } },
    async (request, reply) => {
      const userId = requireAuthenticatedUserId(request, reply, deps.tokenService);
      if (!userId) return;
      const project = await deps.projectRepository.create({ ...request.body, ownerId: userId });
      return reply.status(201).send({ project });
    },
  );

  fastify.get<{ Params: { id: string } }>("/projects/:id", async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply, deps.tokenService);
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
      const userId = requireAuthenticatedUserId(request, reply, deps.tokenService);
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
    const userId = requireAuthenticatedUserId(request, reply, deps.tokenService);
    if (!userId) return;
    const existing = await deps.projectRepository.findById(request.params.id);
    if (!existing || existing.ownerId !== userId) {
      return reply.status(404).send({ error: { message: "Proyecto no encontrado.", statusCode: 404 } });
    }
    await deps.projectRepository.delete(request.params.id);
    return reply.status(204).send();
  });
}
