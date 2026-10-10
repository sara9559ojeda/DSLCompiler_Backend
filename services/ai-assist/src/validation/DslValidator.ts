import { createDefaultPipeline } from "@compiler-img/compiler-core";
import type { IDslValidator, ValidationResult } from "./IDslValidator.js";

/**
 * Wraps the exact same compiler pipeline the rest of the system uses (the
 * standalone core package — no `sharp`, since this service never
 * rasterizes). This is what makes /suggest more than a hopeful LLM
 * passthrough: every generated snippet is actually compiled before it's
 * returned.
 */
export class DslValidator implements IDslValidator {
  validate(source: string): ValidationResult {
    const result = createDefaultPipeline().compile(source);
    return { success: result.success, diagnostics: result.diagnostics };
  }
}
