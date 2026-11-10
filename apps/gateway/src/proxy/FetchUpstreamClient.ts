import type { IUpstreamClient, UpstreamRequest, UpstreamResponse } from "./IUpstreamClient.js";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

export const UPSTREAM_UNAVAILABLE_MESSAGE = "El servicio no está disponible en este momento. Inténtalo más tarde.";

/** An unreachable upstream (DNS, refused connection, reset) answers like any other service error: 503 in the gateway's shape. */
function unavailable(): UpstreamResponse {
  const body = { error: { message: UPSTREAM_UNAVAILABLE_MESSAGE, statusCode: 503 } };
  return { status: 503, contentType: "application/json", body: Buffer.from(JSON.stringify(body)) };
}

/** The only concrete IUpstreamClient in production — forwards via the platform's global fetch. */
export class FetchUpstreamClient implements IUpstreamClient {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async forward({ baseUrl, path, method, body, headers }: UpstreamRequest): Promise<UpstreamResponse> {
    const requestHeaders: Record<string, string> = { ...headers };
    if (body !== undefined) {
      requestHeaders["content-type"] = "application/json";
    }

    let response: Response;
    try {
      response = await this.fetchImpl(new URL(path, baseUrl), {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      return unavailable();
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      status: response.status,
      contentType: response.headers.get("content-type") ?? DEFAULT_CONTENT_TYPE,
      body: Buffer.from(arrayBuffer),
    };
  }
}
