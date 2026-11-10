import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { JwtTokenService } from "../src/auth/JwtTokenService.js";

const SECRET = "test-secret";
const payload = { sub: "user-1", email: "ana@example.com" };

describe("JwtTokenService", () => {
  const service = new JwtTokenService(SECRET, "1h");

  it("verifies a token it issued and returns the same payload", () => {
    expect(service.verify(service.issue(payload))).toEqual(payload);
  });

  it("rejects a token signed with another secret", () => {
    const foreign = new JwtTokenService("other-secret", "1h").issue(payload);
    expect(service.verify(foreign)).toBeNull();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    expect(service.verify(expired)).toBeNull();
  });

  it("rejects a token without a string subject", () => {
    expect(service.verify(jwt.sign({ email: payload.email }, SECRET))).toBeNull();
  });

  it("rejects text that is not a JWT", () => {
    expect(service.verify("not-a-token")).toBeNull();
  });

  it("returns an empty email when the token has none", () => {
    expect(service.verify(jwt.sign({ sub: "user-2" }, SECRET))).toEqual({ sub: "user-2", email: "" });
  });
});
