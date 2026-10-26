import type { UpstreamTarget } from "../config/gateway.config.js";
import type { IUpstreamClient, UpstreamRequest, UpstreamResponse } from "./IUpstreamClient.js";

/**
 * Picks the transport per upstream service: targets with an override (e.g.
 * the compiler over gRPC) use it, every other target uses the fallback.
 * The route registrar only ever sees one IUpstreamClient.
 */
export class TargetRoutingUpstreamClient implements IUpstreamClient {
  constructor(
    private readonly overrides: Partial<Record<UpstreamTarget, IUpstreamClient>>,
    private readonly fallback: IUpstreamClient,
  ) {}

  forward(request: UpstreamRequest): Promise<UpstreamResponse> {
    return (this.overrides[request.target] ?? this.fallback).forward(request);
  }
}
