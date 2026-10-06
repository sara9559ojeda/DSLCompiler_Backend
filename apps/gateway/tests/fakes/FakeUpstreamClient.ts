import type { IUpstreamClient, UpstreamRequest, UpstreamResponse } from "../../src/proxy/IUpstreamClient.js";

export class FakeUpstreamClient implements IUpstreamClient {
  public lastRequest: UpstreamRequest | undefined;

  constructor(private readonly response: UpstreamResponse) {}

  async forward(request: UpstreamRequest): Promise<UpstreamResponse> {
    this.lastRequest = request;
    return this.response;
  }
}
