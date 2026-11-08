import "dotenv/config";

export const HTTP_PORT = Number(process.env.PORT ?? 4004);
export const HTTP_HOST = process.env.HOST ?? "0.0.0.0";

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
export const ANTHROPIC_MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS ?? 2048);
/** Per-request timeout towards Anthropic. */
export const ANTHROPIC_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS ?? 30_000);

/** The assistant tries at most this many times to get DSL that compiles. */
export const ASSIST_MAX_ATTEMPTS = Number(process.env.ASSIST_MAX_ATTEMPTS ?? 3);
/** Overall budget for one assist request; no new attempt starts after it. */
export const ASSIST_DEADLINE_MS = Number(process.env.ASSIST_DEADLINE_MS ?? 45_000);
/** Longest program the assistant will return (characters). */
export const ASSIST_MAX_OUTPUT_CHARS = Number(process.env.ASSIST_MAX_OUTPUT_CHARS ?? 12_000);
