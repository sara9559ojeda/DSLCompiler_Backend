/**
 * All tunable constants for the compiler live here. Nothing below this
 * layer (lexer, parser, semantic analyzer, code generator) should contain a
 * literal default that belongs to configuration.
 *
 * This file must stay platform-agnostic (no `process`, no Node built-ins):
 * it's imported by SemanticAnalyzer/SvgShapeRenderer, which also run inside
 * the browser Web Worker (see src/browser.ts). Node-only settings (HTTP
 * port/host) live in http.config.ts instead, imported only by src/http/*.
 */
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const CANVAS_MARGIN = 20;
export const SVG_FONT_FAMILY = "sans-serif";
export const MAX_STATEMENTS_PER_PROGRAM = 5000;
export const ARROW_LENGTH = 12;
export const ARROW_ANGLE_RADIANS = Math.PI / 6;

export const EXPORT_CONTENT_TYPES: Readonly<Record<"svg" | "png", string>> = Object.freeze({
  svg: "image/svg+xml",
  png: "image/png",
});
