import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import type { Token } from "../lexer/Token.js";
import { TokenType } from "../lexer/TokenType.js";
import { ProgramNode } from "../ast/nodes/ProgramNode.js";
import type { StatementNode } from "../ast/nodes/StatementNode.js";
import { AssignmentNode } from "../ast/nodes/AssignmentNode.js";
import { CommandCallNode } from "../ast/nodes/CommandCallNode.js";
import { ArgumentNode } from "../ast/nodes/ArgumentNode.js";
import {
  type ValueNode,
  NumberLiteralNode,
  StringLiteralNode,
  HexColorLiteralNode,
  IdentifierValueNode,
} from "../ast/nodes/ValueNode.js";
import { ParseError } from "./ParseError.js";
import type { DiagnosticCode } from "../diagnostics/DiagnosticCodes.js";

export interface ParseResult {
  readonly program: ProgramNode;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Hand-written recursive-descent parser for the generic
 * `[id =] command(arg, ..., name=value, ...)` grammar (see docs/grammar.md).
 * On a malformed statement it reports one diagnostic and resynchronizes at
 * the next ';' instead of aborting the whole compile — the user gets every
 * syntax error in one pass, not one-at-a-time.
 */
export class Parser {
  private current = 0;
  private readonly diagnostics: Diagnostic[] = [];

  constructor(private readonly tokens: readonly Token[]) {}

  public parse(): ParseResult {
    const statements: StatementNode[] = [];
    while (!this.isAtEnd()) {
      try {
        statements.push(this.parseStatement());
      } catch (error) {
        if (error instanceof ParseError) {
          this.diagnostics.push({
            severity: "error",
            code: error.code,
            message: error.message,
            position: error.position,
            ...(error.suggestion ? { suggestion: error.suggestion } : {}),
          });
          this.synchronize();
        } else {
          throw error;
        }
      }
    }
    return { program: new ProgramNode(statements), diagnostics: this.diagnostics };
  }

  private parseStatement(): StatementNode {
    const isAssignment = this.check(TokenType.Identifier) && this.checkNext(TokenType.Equals);
    const statement = isAssignment ? this.parseAssignment() : this.parseCommandCall();
    if (!this.check(TokenType.Semicolon)) {
      // Point right after the statement, not at the next token — which is
      // usually on the following line and would look unrelated.
      const last = this.previous();
      throw new ParseError(
        "SYN-001",
        "Se esperaba ';' al final de la instrucción.",
        { line: last.position.line, column: last.position.column + Math.max(1, last.lexeme.length) },
        "Agrega ';' al final de la línea.",
      );
    }
    this.advance();
    return statement;
  }

  private parseAssignment(): AssignmentNode {
    const identifierToken = this.advance();
    this.expect(TokenType.Equals, "SYN-002", "Se esperaba '=' después del identificador.");
    const call = this.parseCommandCall();
    return new AssignmentNode(identifierToken.lexeme, call, identifierToken.position);
  }

  private parseCommandCall(): CommandCallNode {
    const nameToken = this.expect(
      TokenType.Identifier,
      "SYN-003",
      "Se esperaba el nombre de un comando.",
      "Empieza la instrucción con un comando, por ejemplo crear_circulo(...).",
    );
    this.expect(TokenType.LParen, "SYN-004", "Se esperaba '(' después del nombre del comando.");

    const args: ArgumentNode[] = [];
    if (!this.check(TokenType.RParen)) {
      args.push(this.parseArgument());
      while (this.match(TokenType.Comma)) {
        args.push(this.parseArgument());
      }
    }

    this.expect(
      TokenType.RParen,
      "SYN-005",
      "Se esperaba ')' para cerrar los argumentos.",
      "Separa los argumentos con ',' y cierra con ')'.",
    );
    return new CommandCallNode(nameToken.lexeme, args, nameToken.position);
  }

  private parseArgument(): ArgumentNode {
    const startPosition = this.peek().position;
    const isNamed = this.check(TokenType.Identifier) && this.checkNext(TokenType.Equals);

    if (isNamed) {
      const nameToken = this.advance();
      this.advance(); // '='
      const value = this.parseValue();
      return new ArgumentNode(nameToken.lexeme, value, startPosition);
    }

    const value = this.parseValue();
    return new ArgumentNode(null, value, startPosition);
  }

  private parseValue(): ValueNode {
    const token = this.peek();
    switch (token.type) {
      case TokenType.Number:
        this.advance();
        return new NumberLiteralNode(Number.parseFloat(token.lexeme), token.position);
      case TokenType.String:
        this.advance();
        return new StringLiteralNode(token.lexeme, token.position);
      case TokenType.HexColor:
        this.advance();
        return new HexColorLiteralNode(token.lexeme, token.position);
      case TokenType.Identifier:
        this.advance();
        return new IdentifierValueNode(token.lexeme, token.position);
      default:
        throw new ParseError(
          "SYN-006",
          "Se esperaba un valor (número, color, texto o identificador).",
          token.position,
          "Completa el argumento, por ejemplo radio=50.",
        );
    }
  }

  private synchronize(): void {
    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.Semicolon) {
        return;
      }
      this.advance();
    }
  }

  private expect(type: TokenType, code: DiagnosticCode, message: string, suggestion?: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw new ParseError(code, message, this.peek().position, suggestion);
  }

  private match(...types: TokenType[]): boolean {
    if (types.some((type) => this.check(type))) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private checkNext(type: TokenType): boolean {
    const next = this.tokens[this.current + 1];
    return next !== undefined && next.type === type;
  }

  private advance(): Token {
    const token = this.peek();
    if (!this.isAtEnd()) {
      this.current += 1;
    }
    return token;
  }

  private peek(): Token {
    return this.tokens[this.current]!;
  }

  private previous(): Token {
    return this.tokens[this.current - 1]!;
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.Eof;
  }
}
