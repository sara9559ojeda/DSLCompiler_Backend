import jwt from "jsonwebtoken";
import type { ITokenService, TokenPayload } from "./ITokenService.js";

/**
 * Standalone (no Fastify dependency) so route handlers stay unit-testable
 * without a live server. The gateway verifies these same tokens with
 * @fastify/jwt using the identical JWT_SECRET (defense in depth — this
 * service also verifies independently, see projectRoutes.ts and
 * docs/adr/0007-public-services-with-self-verified-auth.md) — see
 * apps/gateway's authPlugin.ts and this service's .env.example.
 */
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  issue(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn } as jwt.SignOptions);
  }

  verify(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (typeof decoded !== "object" || decoded === null || typeof decoded.sub !== "string") {
        return null;
      }
      return { sub: decoded.sub, email: String((decoded as { email?: unknown }).email ?? "") };
    } catch {
      return null;
    }
  }
}
