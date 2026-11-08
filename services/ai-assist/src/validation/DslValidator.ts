import { createDefaultPipeline } from "@saramariaojeda9559/compiler-core";
import type { IDslValidator, ValidationResult } from "./IDslValidator.js";

/**
 * Wraps the exact same compiler pipeline the rest of the system uses (the
 * standalone core package — no `sharp`, since this service never
 * rasterizes). This is what makes /suggest more than a hopeful LLM
 * passthrough: every generated snippet is actually compiled before it's
 * returned.
 */
const VALIDATION_DEADLINE_MS = 2_000;

export class DslValidator implements IDslValidator {
  validate(source: string): ValidationResult {
    // A wall-clock deadline on top of the deterministic step budget: generated programs are untrusted input.
    const result = createDefaultPipeline().compile(source, { deadlineMs: VALIDATION_DEADLINE_MS });
    return { success: result.success, diagnostics: result.diagnostics, svg: result.svg };
  }
}
