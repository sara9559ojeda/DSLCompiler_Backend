import "dotenv/config";

export const HTTP_PORT = Number(process.env.PORT ?? 4004);
export const HTTP_HOST = process.env.HOST ?? "0.0.0.0";

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
export const ANTHROPIC_MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS ?? 1024);
