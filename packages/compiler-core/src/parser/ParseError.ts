import type { SourcePosition } from "../diagnostics/Diagnostic.js";

/**
 * Internal control-flow signal only — the Parser always catches this itself
 * and turns it into a Diagnostic before resynchronizing. It never escapes
 * Parser.parse().
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly position: SourcePosition,
  ) {
    super(message);
    this.name = "ParseError";
  }
}
