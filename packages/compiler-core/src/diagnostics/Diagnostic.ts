export type DiagnosticSeverity = "error" | "warning";

export interface SourcePosition {
  readonly line: number;
  readonly column: number;
}

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly position: SourcePosition;
}
