import type { FastifyInstance } from "fastify";
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  type RegisterRequestBody,
  type LoginRequestBody,
} from "@compiler-img/shared";
import type { IUserRepository } from "../repositories/IUserRepository.js";
import type { IPasswordHasher } from "../auth/IPasswordHasher.js";
import type { ITokenService } from "../auth/ITokenService.js";

export interface AuthRoutesDeps {
  readonly userRepository: IUserRepository;
  readonly passwordHasher: IPasswordHasher;
  readonly tokenService: ITokenService;
}

export function registerAuthRoutes(fastify: FastifyInstance, deps: AuthRoutesDeps): void {
  fastify.post<{ Body: RegisterRequestBody }>(
    "/auth/register",
    { schema: { body: RegisterRequestSchema } },
    async (request, reply) => {
      const { email, password } = request.body;

      const existing = await deps.userRepository.findByEmail(email);
      if (existing) {
        return reply
          .status(409)
          .send({ error: { message: "Ya existe una cuenta con ese correo.", statusCode: 409 } });
      }

      const passwordHash = await deps.passwordHasher.hash(password);
      const user = await deps.userRepository.create(email, passwordHash);
      const token = deps.tokenService.issue({ sub: user.id, email: user.email });
      return reply.status(201).send({ token });
    },
  );

  fastify.post<{ Body: LoginRequestBody }>(
    "/auth/login",
    { schema: { body: LoginRequestSchema } },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await deps.userRepository.findByEmail(email);
      const isValid = user ? await deps.passwordHasher.verify(user.passwordHash, password) : false;

      if (!user || !isValid) {
        return reply
          .status(401)
          .send({ error: { message: "Correo o contraseña incorrectos.", statusCode: 401 } });
      }

      const token = deps.tokenService.issue({ sub: user.id, email: user.email });
      return reply.send({ token });
    },
  );
}
