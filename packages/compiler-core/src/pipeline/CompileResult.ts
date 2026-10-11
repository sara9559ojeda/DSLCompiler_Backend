import type { Diagnostic } from "../diagnostics/Diagnostic.js";

export interface CompileResult {
  readonly success: boolean;
  readonly svg: string | null;
  readonly diagnostics: readonly Diagnostic[];
}
