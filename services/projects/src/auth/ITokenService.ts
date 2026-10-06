export interface TokenPayload {
  readonly sub: string;
  readonly email: string;
}

export interface ITokenService {
  issue(payload: TokenPayload): string;
}
