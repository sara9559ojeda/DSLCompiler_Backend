import type { Diagnostic } from "@saramariaojeda9559/compiler-core";

export interface ValidationResult {
  readonly success: boolean;
  readonly diagnostics: readonly Diagnostic[];
  /** The rendered SVG when it compiled: the preview the user sees before accepting a proposal. */
  readonly svg?: string | null;
}

export interface IDslValidator {
  validate(source: string): ValidationResult;
}
