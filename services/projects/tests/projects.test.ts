import { describe, expect, it } from "vitest";
import { buildTestServer, authHeaderFor } from "./testServer.js";

describe("project routes", () => {
  it("rejects a request with no Authorization header", async () => {
    const app = buildTestServer();
    const response = await app.inject({ method: "GET", url: "/projects" });
    expect(response.statusCode).toBe(401);
  });

  it("rejects a request with a malformed/invalid bearer token", async () => {
    const app = buildTestServer();
    const response = await app.inject({
      method: "GET",
      url: "/projects",
      headers: { authorization: "Bearer not-a-real-token" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("creates a project and lists it scoped to its owner only", async () => {
    const app = buildTestServer();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      headers: authHeaderFor("user-1"),
      payload: { name: "Mi diagrama", dslSource: "c1 = crear_circulo(radio=1, x=0, y=0);" },
    });
    expect(created.statusCode).toBe(201);

    const ownerList = await app.inject({
      method: "GET",
      url: "/projects",
      headers: authHeaderFor("user-1"),
    });
    expect(ownerList.json().projects).toHaveLength(1);

    const otherUserList = await app.inject({
      method: "GET",
      url: "/projects",
      headers: authHeaderFor("user-2"),
    });
    expect(otherUserList.json().projects).toHaveLength(0);
  });

  it("returns 404 for a project owned by someone else", async () => {
    const app = buildTestServer();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      headers: authHeaderFor("user-1"),
      payload: { name: "Mi diagrama", dslSource: "x" },
    });
    const projectId = created.json().project.id;

    const response = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
      headers: authHeaderFor("user-2"),
    });
    expect(response.statusCode).toBe(404);
  });

  it("updates a project it owns", async () => {
    const app = buildTestServer();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      headers: authHeaderFor("user-1"),
      payload: { name: "Original", dslSource: "x" },
    });
    const projectId = created.json().project.id;

    const updated = await app.inject({
      method: "PUT",
      url: `/projects/${projectId}`,
      headers: authHeaderFor("user-1"),
      payload: { name: "Renombrado" },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json().project.name).toBe("Renombrado");
  });

  it("refuses to update a project owned by someone else", async () => {
    const app = buildTestServer();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      headers: authHeaderFor("user-1"),
      payload: { name: "Original", dslSource: "x" },
    });
    const projectId = created.json().project.id;

    const response = await app.inject({
      method: "PUT",
      url: `/projects/${projectId}`,
      headers: authHeaderFor("user-2"),
      payload: { name: "Hackeado" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("deletes a project it owns", async () => {
    const app = buildTestServer();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      headers: authHeaderFor("user-1"),
      payload: { name: "Original", dslSource: "x" },
    });
    const projectId = created.json().project.id;

    const deleted = await app.inject({
      method: "DELETE",
      url: `/projects/${projectId}`,
      headers: authHeaderFor("user-1"),
    });
    expect(deleted.statusCode).toBe(204);

    const getAfterDelete = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
      headers: authHeaderFor("user-1"),
    });
    expect(getAfterDelete.statusCode).toBe(404);
  });
});
