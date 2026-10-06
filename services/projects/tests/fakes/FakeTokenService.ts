import type { ITokenService, TokenPayload } from "../../src/auth/ITokenService.js";

export class FakeTokenService implements ITokenService {
  issue(payload: TokenPayload): string {
    return `token:${payload.sub}`;
  }
}
