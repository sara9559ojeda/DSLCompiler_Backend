import type { ITokenService, TokenPayload } from "../../src/auth/ITokenService.js";

/** Reversible fake — `verify` parses what `issue` produced, so tests can round-trip without real JWTs. */
export class FakeTokenService implements ITokenService {
  issue(payload: TokenPayload): string {
    return `token:${payload.sub}:${payload.email}`;
  }

  verify(token: string): TokenPayload | null {
    const match = /^token:([^:]+):(.*)$/.exec(token);
    if (!match) return null;
    return { sub: match[1]!, email: match[2]! };
  }
}
