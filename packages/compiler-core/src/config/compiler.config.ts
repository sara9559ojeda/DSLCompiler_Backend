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

/**
 * Execution limits. A DSL program is code, so it must not be able to hang a
 * browser tab or a backend worker: every loop, call and emitted element is
 * metered. Exceeding a limit stops the program with a diagnostic (SEM-022..025).
 */
export interface ExecutionLimits {
  /** Iterations of any single `para` loop. */
  readonly maxLoopIterations: number;
  /** Nested function calls (recursion included). */
  readonly maxCallDepth: number;
  /** Shapes (and, separately, connections) the scene may contain. */
  readonly maxShapes: number;
  /** Characters in any text value (stops `s = s + s` from doubling memory). */
  readonly maxStringLength: number;
  /** Evaluation steps (statements + expression nodes + loop iterations) per compile. */
  readonly maxSteps: number;
}

export const DEFAULT_EXECUTION_LIMITS: ExecutionLimits = {
  maxLoopIterations: 10_000,
  maxCallDepth: 64,
  maxShapes: 5_000,
  maxStringLength: 10_000,
  maxSteps: 500_000,
};

/** Angles in the DSL (sin, cos, tan, rotacion) are in degrees. */
export const ANGLE_UNIT = "degrees";

/**
 * Version of the *language* (syntax + semantics). Bump it when a program can
 * mean something different. The web worker and the backend both import it from
 * this package, so a mismatch is detectable (see /health and the inspector).
 */
export const LANGUAGE_VERSION = "2.0.0";
