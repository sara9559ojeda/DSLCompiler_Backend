import { randomUUID } from "node:crypto";
import type { IUserRepository } from "../../src/repositories/IUserRepository.js";
import type { User } from "../../src/domain/User.js";

export class InMemoryUserRepository implements IUserRepository {
  private readonly usersById = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    return [...this.usersById.values()].find((user) => user.email === email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersById.get(id) ?? null;
  }

  async create(email: string, passwordHash: string): Promise<User> {
    const user: User = { id: randomUUID(), email, passwordHash, createdAt: new Date() };
    this.usersById.set(user.id, user);
    return user;
  }
}
