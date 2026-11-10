import { describe, expect, it } from "vitest";
import { TargetRoutingUpstreamClient } from "../src/proxy/TargetRoutingUpstreamClient.js";
import type { UpstreamRequest } from "../src/proxy/IUpstreamClient.js";
import { FakeUpstreamClient } from "./fakes/FakeUpstreamClient.js";

const response = (marker: string) => ({ status: 200, contentType: "text/plain", body: Buffer.from(marker) });

const request = (target: UpstreamRequest["target"]): UpstreamRequest => ({
  target,
  baseUrl: "http://upstream",
  path: "/x",
  method: "POST",
  body: {},
});

describe("TargetRoutingUpstreamClient", () => {
  it("sends a target that has an override to that override", async () => {
    const grpc = new FakeUpstreamClient(response("grpc"));
    const http = new FakeUpstreamClient(response("http"));
    const client = new TargetRoutingUpstreamClient({ compiler: grpc }, http);

    const result = await client.forward(request("compiler"));

    expect(result.body.toString()).toBe("grpc");
    expect(http.lastRequest).toBeUndefined();
  });

  it("sends every other target to the fallback", async () => {
    const grpc = new FakeUpstreamClient(response("grpc"));
    const http = new FakeUpstreamClient(response("http"));
    const client = new TargetRoutingUpstreamClient({ compiler: grpc }, http);

    const result = await client.forward(request("ai"));

    expect(result.body.toString()).toBe("http");
    expect(grpc.lastRequest).toBeUndefined();
  });

  it("forwards the request unchanged", async () => {
    const http = new FakeUpstreamClient(response("http"));
    const original = request("projects");

    await new TargetRoutingUpstreamClient({}, http).forward(original);

    expect(http.lastRequest).toBe(original);
  });
});
