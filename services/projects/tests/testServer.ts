import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/http/server.js";
import { InMemoryUserRepository } from "./fakes/InMemoryUserRepository.js";
import { InMemoryProjectRepository } from "./fakes/InMemoryProjectRepository.js";
import { FakePasswordHasher } from "./fakes/FakePasswordHasher.js";
import { FakeTokenService } from "./fakes/FakeTokenService.js";

/** A fresh server backed by in-memory fakes — no Postgres needed for these tests (DIP). */
export function buildTestServer(): FastifyInstance {
  return buildServer({
    userRepository: new InMemoryUserRepository(),
    projectRepository: new InMemoryProjectRepository(),
    passwordHasher: new FakePasswordHasher(),
    tokenService: new FakeTokenService(),
  });
}
