export type UpstreamMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface UpstreamRequest {
  readonly baseUrl: string;
  readonly path: string;
  readonly method: UpstreamMethod;
  readonly body: unknown;
  /** Trusted internal headers the gateway adds itself (e.g. x-user-id after JWT verification) — never client-supplied. */
  readonly headers?: Readonly<Record<string, string>>;
}

export interface UpstreamResponse {
  readonly status: number;
  readonly contentType: string;
  readonly body: Buffer;
}

/**
 * Abstraction the route registrar depends on instead of a concrete HTTP
 * client (Dependency Inversion). This is also what makes the gateway
 * testable without a live compiler/AI service: tests inject a fake
 * implementation (see tests/fakes/FakeUpstreamClient.ts).
 */
export interface IUpstreamClient {
  forward(request: UpstreamRequest): Promise<UpstreamResponse>;
}
