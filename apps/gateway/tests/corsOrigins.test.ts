import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { parseCorsOrigins } from "../src/config/corsOrigins.js";
import { corsPlugin } from "../src/plugins/corsPlugin.js";

const PREVIEW_PATTERN = "https://dslcompiler-*-team.vercel.app";

function matches(raw: string, origin: string): boolean {
  const parsed = parseCorsOrigins(raw);
  if (parsed === true) return true;
  return parsed.some((entry) => (typeof entry === "string" ? entry === origin : entry.test(origin)));
}

describe("parseCorsOrigins", () => {
  it("allows any origin for '*', an empty value or no value", () => {
    expect(parseCorsOrigins("*")).toBe(true);
    expect(parseCorsOrigins("")).toBe(true);
    expect(parseCorsOrigins(undefined)).toBe(true);
  });

  it("splits a comma-separated list and trims spaces and trailing slashes", () => {
    expect(parseCorsOrigins(" https://a.app/ , https://b.app ")).toEqual(["https://a.app", "https://b.app"]);
  });

  it("matches a Vercel preview URL against a wildcard entry", () => {
    expect(matches(PREVIEW_PATTERN, "https://dslcompiler-2bawsa275-team.vercel.app")).toBe(true);
  });

  it("never lets a wildcard cross a dot into another domain", () => {
    expect(matches(PREVIEW_PATTERN, "https://dslcompiler-x.evil.com-team.vercel.app")).toBe(false);
    expect(matches(PREVIEW_PATTERN, "https://dslcompiler--team.vercel.app")).toBe(false);
  });

  it("treats regex characters in an origin literally", () => {
    expect(matches("https://a.app", "https://aXapp")).toBe(false);
  });
});

describe("corsPlugin", () => {
  async function preflight(origins: ReturnType<typeof parseCorsOrigins>, origin: string) {
    const app = Fastify();
    await app.register(corsPlugin, { origins });
    app.post("/x", async () => ({}));
    return app.inject({
      method: "OPTIONS",
      url: "/x",
      headers: { origin, "access-control-request-method": "POST" },
    });
  }

  it("echoes an allowed origin", async () => {
    const response = await preflight(parseCorsOrigins(`https://prod.app,${PREVIEW_PATTERN}`), "https://dslcompiler-abc-team.vercel.app");
    expect(response.headers["access-control-allow-origin"]).toBe("https://dslcompiler-abc-team.vercel.app");
  });

  it("does not allow an origin outside the list", async () => {
    const response = await preflight(parseCorsOrigins("https://prod.app"), "https://other.app");
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
