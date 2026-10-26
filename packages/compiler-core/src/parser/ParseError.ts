import type { SourcePosition } from "../diagnostics/Diagnostic.js";
import type { DiagnosticCode } from "../diagnostics/DiagnosticCodes.js";

/**
 * Internal control-flow signal only — the Parser always catches this itself
 * and turns it into a Diagnostic before resynchronizing. It never escapes
 * Parser.parse().
 */
export class ParseError extends Error {
  constructor(
    public readonly code: DiagnosticCode,
    message: string,
    public readonly position: SourcePosition,
    public readonly suggestion?: string,
  ) {
    super(message);
    this.name = "ParseError";
  }
}
