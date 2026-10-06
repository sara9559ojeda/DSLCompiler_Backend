import type { IUpstreamClient, UpstreamRequest, UpstreamResponse } from "./IUpstreamClient.js";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

/** The only concrete IUpstreamClient in production — forwards via the platform's global fetch. */
export class FetchUpstreamClient implements IUpstreamClient {
  async forward({ baseUrl, path, method, body, headers }: UpstreamRequest): Promise<UpstreamResponse> {
    const requestHeaders: Record<string, string> = { ...headers };
    if (body !== undefined) {
      requestHeaders["content-type"] = "application/json";
    }

    const response = await fetch(new URL(path, baseUrl), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const arrayBuffer = await response.arrayBuffer();
    return {
      status: response.status,
      contentType: response.headers.get("content-type") ?? DEFAULT_CONTENT_TYPE,
      body: Buffer.from(arrayBuffer),
    };
  }
}
