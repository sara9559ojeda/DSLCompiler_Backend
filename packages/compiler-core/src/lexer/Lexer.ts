import type { Diagnostic } from "@compiler-img/shared";
import { Token } from "./Token.js";
import { TokenType } from "./TokenType.js";

export interface LexResult {
  readonly tokens: readonly Token[];
  readonly diagnostics: readonly Diagnostic[];
}

const isDigit = (char: string): boolean => char >= "0" && char <= "9";
const isAlpha = (char: string): boolean => /[a-zA-Z_]/.test(char);
const isAlphaNumeric = (char: string): boolean => isAlpha(char) || isDigit(char);
const isHexDigit = (char: string): boolean => /[0-9a-fA-F]/.test(char);

/**
 * Turns DSL source text into a flat token stream. Knows nothing about
 * shapes/commands — that vocabulary lives entirely in the semantic layer,
 * so adding a new command never requires touching this class (Open/Closed).
 */
export class Lexer {
  private position = 0;
  private line = 1;
  private column = 1;
  private readonly tokens: Token[] = [];
  private readonly diagnostics: Diagnostic[] = [];

  constructor(private readonly source: string) {}

  public tokenize(): LexResult {
    while (!this.isAtEnd()) {
      this.scanToken();
    }
    this.tokens.push(new Token(TokenType.Eof, "", this.currentPosition()));
    return { tokens: this.tokens, diagnostics: this.diagnostics };
  }

  private scanToken(): void {
    const startPos = this.currentPosition();
    const char = this.advance();

    switch (char) {
      case " ":
      case "\t":
      case "\r":
        return;
      case "\n":
        this.line += 1;
        this.column = 1;
        return;
      case "=":
        this.tokens.push(new Token(TokenType.Equals, char, startPos));
        return;
      case "(":
        this.tokens.push(new Token(TokenType.LParen, char, startPos));
        return;
      case ")":
        this.tokens.push(new Token(TokenType.RParen, char, startPos));
        return;
      case ",":
        this.tokens.push(new Token(TokenType.Comma, char, startPos));
        return;
      case ";":
        this.tokens.push(new Token(TokenType.Semicolon, char, startPos));
        return;
      case "#":
        this.scanHexColor(startPos);
        return;
      case '"':
        this.scanString(startPos);
        return;
      case "/":
        if (this.peek() === "/") {
          this.scanLineComment();
          return;
        }
        this.reportUnexpectedChar(char, startPos);
        return;
      default:
        if (char === "-" && isDigit(this.peek())) {
          this.scanNumber(startPos, char);
          return;
        }
        if (isDigit(char)) {
          this.scanNumber(startPos, char);
          return;
        }
        if (isAlpha(char)) {
          this.scanIdentifier(startPos, char);
          return;
        }
        this.reportUnexpectedChar(char, startPos);
    }
  }

  private scanHexColor(startPos: { line: number; column: number }): void {
    let lexeme = "#";
    while (isHexDigit(this.peek())) {
      lexeme += this.advance();
    }
    if (lexeme.length === 1) {
      this.diagnostics.push({
        severity: "error",
        message: "Se esperaba al menos un dígito hexadecimal después de '#'.",
        position: startPos,
      });
      return;
    }
    this.tokens.push(new Token(TokenType.HexColor, lexeme, startPos));
  }

  private scanString(startPos: { line: number; column: number }): void {
    let lexeme = "";
    while (!this.isAtEnd() && this.peek() !== '"' && this.peek() !== "\n") {
      lexeme += this.advance();
    }
    if (this.isAtEnd() || this.peek() === "\n") {
      this.diagnostics.push({
        severity: "error",
        message: "Cadena de texto sin cerrar (falta '\"').",
        position: startPos,
      });
      return;
    }
    this.advance(); // closing quote
    this.tokens.push(new Token(TokenType.String, lexeme, startPos));
  }

  private scanNumber(startPos: { line: number; column: number }, first: string): void {
    let lexeme = first;
    while (isDigit(this.peek())) {
      lexeme += this.advance();
    }
    if (this.peek() === "." && isDigit(this.peekNext())) {
      lexeme += this.advance(); // consume '.'
      while (isDigit(this.peek())) {
        lexeme += this.advance();
      }
    }
    this.tokens.push(new Token(TokenType.Number, lexeme, startPos));
  }

  private scanIdentifier(startPos: { line: number; column: number }, first: string): void {
    let lexeme = first;
    while (isAlphaNumeric(this.peek())) {
      lexeme += this.advance();
    }
    this.tokens.push(new Token(TokenType.Identifier, lexeme, startPos));
  }

  private scanLineComment(): void {
    while (!this.isAtEnd() && this.peek() !== "\n") {
      this.advance();
    }
  }

  private reportUnexpectedChar(char: string, position: { line: number; column: number }): void {
    this.diagnostics.push({
      severity: "error",
      message: `Carácter inesperado: '${char}'.`,
      position,
    });
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private advance(): string {
    const char = this.source[this.position]!;
    this.position += 1;
    this.column += 1;
    return char;
  }

  private peek(): string {
    return this.isAtEnd() ? "\0" : this.source[this.position]!;
  }

  private peekNext(): string {
    return this.position + 1 >= this.source.length ? "\0" : this.source[this.position + 1]!;
  }

  private currentPosition(): { line: number; column: number } {
    return { line: this.line, column: this.column };
  }
}
