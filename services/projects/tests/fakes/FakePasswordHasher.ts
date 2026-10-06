import type { IPasswordHasher } from "../../src/auth/IPasswordHasher.js";

/** Avoids paying real argon2 cost in unit tests — Argon2PasswordHasher itself isn't exercised here. */
export class FakePasswordHasher implements IPasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return hash === `hashed:${plainPassword}`;
  }
}
