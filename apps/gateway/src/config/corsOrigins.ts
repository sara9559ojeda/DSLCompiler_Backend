/** What @fastify/cors accepts as `origin`: everything (`true`) or an allow-list. */
export type CorsOriginOption = true | ReadonlyArray<string | RegExp>;

/** A `*` inside an origin stands for one DNS label fragment: letters, digits and dashes, never a dot. */
const WILDCARD_SEGMENT = "[a-z0-9-]+";

function escapeRegExp(text: string): string {
  return text.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

function toMatcher(origin: string): string | RegExp {
  if (!origin.includes("*")) return origin;
  const pattern = origin.split("*").map(escapeRegExp).join(WILDCARD_SEGMENT);
  return new RegExp(`^${pattern}$`, "i");
}

/**
 * Parses CORS_ORIGIN: `*` (or empty) allows any origin; otherwise a
 * comma-separated list of exact origins, where `*` may stand for part of a
 * host — e.g. `https://myapp-*.vercel.app` for Vercel preview deployments.
 * A wildcard never crosses a dot, so it cannot match a different domain.
 */
export function parseCorsOrigins(raw: string | undefined): CorsOriginOption {
  const entries = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter((entry) => entry !== "");

  if (entries.length === 0 || entries.includes("*")) return true;
  return entries.map(toMatcher);
}
