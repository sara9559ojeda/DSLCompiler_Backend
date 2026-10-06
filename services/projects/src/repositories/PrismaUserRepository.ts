import type { PrismaClient } from "@prisma/client";
import type { IUserRepository } from "./IUserRepository.js";
import type { User } from "../domain/User.js";

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(email: string, passwordHash: string): Promise<User> {
    return this.prisma.user.create({ data: { email, passwordHash } });
  }
}
