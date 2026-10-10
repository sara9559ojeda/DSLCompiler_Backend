/**
 * All tunable constants for the compiler live here. Nothing below this
 * layer (lexer, parser, semantic analyzer, code generator) should contain a
 * literal default that belongs to configuration.
 *
 * This file must stay platform-agnostic (no `process`, no Node built-ins):
 * this whole package is imported from the browser (apps/web's Web Worker)
 * as well as from Node services.
 */
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const CANVAS_MARGIN = 20;
export const SVG_FONT_FAMILY = "sans-serif";
export const MAX_STATEMENTS_PER_PROGRAM = 5000;
export const ARROW_LENGTH = 12;
export const ARROW_ANGLE_RADIANS = Math.PI / 6;
