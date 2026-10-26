import type { ExportFormat } from "../export/IExporter.js";

export const EXPORT_CONTENT_TYPES: Readonly<Record<ExportFormat, string>> = Object.freeze({
  svg: "image/svg+xml",
  png: "image/png",
});
