export interface TokenPayload {
  readonly sub: string;
  readonly email: string;
}

export interface ITokenService {
  issue(payload: TokenPayload): string;
  /** Returns the decoded payload if `token` is a validly-signed, unexpired JWT; null otherwise. */
  verify(token: string): TokenPayload | null;
}
