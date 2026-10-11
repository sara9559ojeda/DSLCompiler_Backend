import type { SourcePosition } from "../diagnostics/Diagnostic.js";
import type { TokenType } from "./TokenType.js";

export class Token {
  constructor(
    public readonly type: TokenType,
    public readonly lexeme: string,
    public readonly position: SourcePosition,
  ) {}
}
