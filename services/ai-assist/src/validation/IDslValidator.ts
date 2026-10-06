import type { Diagnostic } from "@compiler-img/shared";

export interface ValidationResult {
  readonly success: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

export interface IDslValidator {
  validate(source: string): ValidationResult;
}
