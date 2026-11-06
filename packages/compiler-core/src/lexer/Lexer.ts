import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Token } from "./Token.js";
import { KEYWORDS, TokenType } from "./TokenType.js";

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
    this.tokens.push(new Token(TokenType.Eof, "", this.currentPosition(), this.position, 0));
    return { tokens: this.tokens, diagnostics: this.diagnostics };
  }

  private scanToken(): void {
    const startPos = this.currentPosition();
    const startOffset = this.position;
    const char = this.advance();
    const simple = (type: TokenType, lexeme = char): void => {
      this.tokens.push(new Token(type, lexeme, startPos, startOffset, lexeme.length));
    };

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
        if (this.peek() === "=") {
          this.advance();
          simple(TokenType.EqualEqual, "==");
        } else simple(TokenType.Equals);
        return;
      case "!":
        if (this.peek() === "=") {
          this.advance();
          simple(TokenType.BangEqual, "!=");
        } else simple(TokenType.Bang);
        return;
      case "<":
        if (this.peek() === "=") {
          this.advance();
          simple(TokenType.LessEqual, "<=");
        } else simple(TokenType.Less);
        return;
      case ">":
        if (this.peek() === "=") {
          this.advance();
          simple(TokenType.GreaterEqual, ">=");
        } else simple(TokenType.Greater);
        return;
      case "&":
        if (this.peek() === "&") {
          this.advance();
          simple(TokenType.AndAnd, "&&");
        } else this.reportUnexpectedChar(char, startPos);
        return;
      case "|":
        if (this.peek() === "|") {
          this.advance();
          simple(TokenType.OrOr, "||");
        } else this.reportUnexpectedChar(char, startPos);
        return;
      case "(":
        simple(TokenType.LParen);
        return;
      case ")":
        simple(TokenType.RParen);
        return;
      case "{":
        simple(TokenType.LBrace);
        return;
      case "}":
        simple(TokenType.RBrace);
        return;
      case ",":
        simple(TokenType.Comma);
        return;
      case ";":
        simple(TokenType.Semicolon);
        return;
      case "+":
        simple(TokenType.Plus);
        return;
      case "-":
        simple(TokenType.Minus);
        return;
      case "*":
        simple(TokenType.Star);
        return;
      case "%":
        simple(TokenType.Percent);
        return;
      case "#":
        this.scanHexColor(startPos, startOffset);
        return;
      case '"':
        this.scanString(startPos, startOffset);
        return;
      case "/":
        if (this.peek() === "/") {
          this.scanLineComment();
          return;
        }
        simple(TokenType.Slash);
        return;
      default:
        if (isDigit(char)) {
          this.scanNumber(startPos, startOffset, char);
          return;
        }
        if (isAlpha(char)) {
          this.scanIdentifier(startPos, startOffset, char);
          return;
        }
        this.reportUnexpectedChar(char, startPos);
    }
  }

  private scanHexColor(startPos: { line: number; column: number }, startOffset: number): void {
    let lexeme = "#";
    while (isHexDigit(this.peek())) {
      lexeme += this.advance();
    }
    if (lexeme.length === 1) {
      this.diagnostics.push({
        severity: "error",
        code: "LEX-002",
        message: "Se esperaba al menos un dígito hexadecimal después de '#'.",
        position: startPos,
        suggestion: "Escribe el color completo, por ejemplo #ff0000, o usa un nombre como rojo.",
      });
      return;
    }
    this.tokens.push(new Token(TokenType.HexColor, lexeme, startPos, startOffset, lexeme.length));
  }

  private scanString(startPos: { line: number; column: number }, startOffset: number): void {
    let lexeme = "";
    while (!this.isAtEnd() && this.peek() !== '"' && this.peek() !== "\n") {
      lexeme += this.advance();
    }
    if (this.isAtEnd() || this.peek() === "\n") {
      this.diagnostics.push({
        severity: "error",
        code: "LEX-003",
        message: "Cadena de texto sin cerrar (falta '\"').",
        position: startPos,
        suggestion: "Cierra el texto con comillas dobles en la misma línea.",
      });
      return;
    }
    this.advance(); // closing quote
    this.tokens.push(new Token(TokenType.String, lexeme, startPos, startOffset, lexeme.length + 2));
  }

  private scanNumber(startPos: { line: number; column: number }, startOffset: number, first: string): void {
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
    this.tokens.push(new Token(TokenType.Number, lexeme, startPos, startOffset, lexeme.length));
  }

  private scanIdentifier(startPos: { line: number; column: number }, startOffset: number, first: string): void {
    let lexeme = first;
    while (isAlphaNumeric(this.peek())) {
      lexeme += this.advance();
    }
    this.tokens.push(new Token(KEYWORDS[lexeme] ?? TokenType.Identifier, lexeme, startPos, startOffset, lexeme.length));
  }

  private scanLineComment(): void {
    while (!this.isAtEnd() && this.peek() !== "\n") {
      this.advance();
    }
  }

  private reportUnexpectedChar(char: string, position: { line: number; column: number }): void {
    this.diagnostics.push({
      severity: "error",
      code: "LEX-001",
      message: `Carácter inesperado: '${char}'.`,
      position,
      suggestion:
        char === "'"
          ? 'Usa comillas dobles (") para el texto.'
          : char === "/"
            ? "Los comentarios empiezan con //."
            : `Elimina el carácter '${char}'.`,
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
