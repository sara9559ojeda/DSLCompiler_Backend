import { describe, expect, it } from "vitest";
import { resolveUpstreamPath } from "../src/routes/resolveUpstreamPath.js";

describe("resolveUpstreamPath", () => {
  it("substitutes a single :param", () => {
    expect(resolveUpstreamPath("/projects/:id", { id: "abc-123" })).toBe("/projects/abc-123");
  });

  it("leaves a template with no matching param untouched", () => {
    expect(resolveUpstreamPath("/projects/:id", {})).toBe("/projects/:id");
  });

  it("passes through a template with no params at all", () => {
    expect(resolveUpstreamPath("/compile", {})).toBe("/compile");
  });
});
