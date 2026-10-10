import type { Diagnostic } from "@compiler-img/shared";

export interface CompileResult {
  readonly success: boolean;
  readonly svg: string | null;
  readonly diagnostics: readonly Diagnostic[];
}
