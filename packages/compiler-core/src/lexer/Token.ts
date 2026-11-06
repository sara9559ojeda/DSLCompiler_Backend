import type { SourcePosition } from "../diagnostics/Diagnostic.js";
import type { TokenType } from "./TokenType.js";

export class Token {
  /**
   * `offset`/`length` locate the token in the source text (0-based, in UTF-16
   * code units — what Monaco's model offsets use) so tools can edit the exact
   * characters. For strings, `length` includes the quotes.
   */
  constructor(
    public readonly type: TokenType,
    public readonly lexeme: string,
    public readonly position: SourcePosition,
    public readonly offset: number = 0,
    public readonly length: number = lexeme.length,
  ) {}
}
