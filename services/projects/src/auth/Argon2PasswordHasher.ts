import argon2 from "argon2";
import type { IPasswordHasher } from "./IPasswordHasher.js";

export class Argon2PasswordHasher implements IPasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword);
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
  }
}
