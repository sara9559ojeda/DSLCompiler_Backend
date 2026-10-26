import type { DiagnosticCode } from "./DiagnosticCodes.js";

export type DiagnosticSeverity = "error" | "warning";

export interface SourcePosition {
  readonly line: number;
  readonly column: number;
}

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  /** Stable identifier (e.g. "SEM-009") — see DiagnosticCodes.ts. Safe to match on; messages may change wording. */
  readonly code: DiagnosticCode;
  readonly message: string;
  readonly position: SourcePosition;
  /** A concrete next step ("¿Quisiste decir 'crear_circulo'?"), when one can be inferred. */
  readonly suggestion?: string;
  /** The source line the diagnostic points at, filled in by CompilerPipeline. */
  readonly snippet?: string;
}
