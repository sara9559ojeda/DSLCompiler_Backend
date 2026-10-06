import { describe, expect, it } from "vitest";
import { buildTestServer } from "./testServer.js";

describe("auth routes", () => {
  it("registers a new user and returns a token", async () => {
    const app = buildTestServer();
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "ana@example.com", password: "supersecret" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().token).toBeTruthy();
  });

  it("rejects registering the same email twice", async () => {
    const app = buildTestServer();
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "ana@example.com", password: "supersecret" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "ana@example.com", password: "other-password" },
    });

    expect(response.statusCode).toBe(409);
  });

  it("rejects a malformed email at the schema level", async () => {
    const app = buildTestServer();
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "not-an-email", password: "supersecret" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a password shorter than the minimum length", async () => {
    const app = buildTestServer();
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "ana@example.com", password: "short" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("logs in with correct credentials", async () => {
    const app = buildTestServer();
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "ana@example.com", password: "supersecret" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@example.com", password: "supersecret" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().token).toBeTruthy();
  });

  it("rejects login with the wrong password", async () => {
    const app = buildTestServer();
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "ana@example.com", password: "supersecret" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@example.com", password: "wrong-password" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects login for an unknown email", async () => {
    const app = buildTestServer();
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "nadie@example.com", password: "whatever1" },
    });

    expect(response.statusCode).toBe(401);
  });
});
