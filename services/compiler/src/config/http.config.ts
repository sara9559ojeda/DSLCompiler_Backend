/** Node-only settings, read from the environment. Imported only by src/http/* and src/main.ts. */
export const HTTP_PORT = Number(process.env.PORT ?? 4001);
export const HTTP_HOST = process.env.HOST ?? "0.0.0.0";
