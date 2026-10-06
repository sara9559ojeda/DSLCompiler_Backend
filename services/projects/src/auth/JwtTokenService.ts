import jwt from "jsonwebtoken";
import type { ITokenService, TokenPayload } from "./ITokenService.js";

/**
 * Standalone (no Fastify dependency) so route handlers stay unit-testable
 * without a live server. The gateway verifies these same tokens with
 * @fastify/jwt using the identical JWT_SECRET — see apps/gateway's
 * authPlugin.ts and this service's .env.example.
 */
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  issue(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn } as jwt.SignOptions);
  }
}
