import "dotenv/config";

export const HTTP_PORT = Number(process.env.PORT ?? 4003);
export const HTTP_HOST = process.env.HOST ?? "0.0.0.0";

export const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
