import type { Diagnostic } from "@saramariaojeda9559/compiler-core";

export interface ValidationResult {
  readonly success: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

export interface IDslValidator {
  validate(source: string): ValidationResult;
}
