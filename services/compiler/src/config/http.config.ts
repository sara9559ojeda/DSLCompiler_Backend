/** Node-only settings, read from the environment. Imported only by src/http/*. */
export const HTTP_PORT = Number(process.env.PORT ?? 4001);
export const HTTP_HOST = process.env.HOST ?? "0.0.0.0";

export const EXPORT_CONTENT_TYPES: Readonly<Record<"svg" | "png", string>> = Object.freeze({
  svg: "image/svg+xml",
  png: "image/png",
});
