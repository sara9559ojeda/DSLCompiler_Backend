import Fastify, { type FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import type { IUserRepository } from "../repositories/IUserRepository.js";
import type { IProjectRepository } from "../repositories/IProjectRepository.js";
import { PrismaUserRepository } from "../repositories/PrismaUserRepository.js";
import { PrismaProjectRepository } from "../repositories/PrismaProjectRepository.js";
import type { IPasswordHasher } from "../auth/IPasswordHasher.js";
import { Argon2PasswordHasher } from "../auth/Argon2PasswordHasher.js";
import type { ITokenService } from "../auth/ITokenService.js";
import { JwtTokenService } from "../auth/JwtTokenService.js";
import { registerAuthRoutes } from "../routes/authRoutes.js";
import { registerProjectRoutes } from "../routes/projectRoutes.js";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/projects.config.js";

export interface BuildServerOptions {
  /** Injected in tests to run against in-memory fakes instead of a real Postgres (DIP). */
  readonly userRepository?: IUserRepository;
  readonly projectRepository?: IProjectRepository;
  readonly passwordHasher?: IPasswordHasher;
  readonly tokenService?: ITokenService;
}

let sharedPrismaClient: PrismaClient | null = null;

/** Constructed at most once, and only when a caller doesn't supply its own repositories. */
function getSharedPrismaClient(): PrismaClient {
  sharedPrismaClient ??= new PrismaClient();
  return sharedPrismaClient;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const fastify = Fastify({ logger: false });

  const userRepository = options.userRepository ?? new PrismaUserRepository(getSharedPrismaClient());
  const projectRepository = options.projectRepository ?? new PrismaProjectRepository(getSharedPrismaClient());
  const passwordHasher = options.passwordHasher ?? new Argon2PasswordHasher();
  const tokenService = options.tokenService ?? new JwtTokenService(JWT_SECRET, JWT_EXPIRES_IN);

  fastify.get("/health", async () => ({ status: "ok" }));

  registerAuthRoutes(fastify, { userRepository, passwordHasher, tokenService });
  registerProjectRoutes(fastify, { projectRepository });

  return fastify;
}
