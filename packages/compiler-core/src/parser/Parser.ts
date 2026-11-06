import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import type { Token } from "../lexer/Token.js";
import { KEYWORDS, TokenType } from "../lexer/TokenType.js";
import type { Span } from "../ast/Span.js";
import { ProgramNode } from "../ast/nodes/ProgramNode.js";
import {
  BlockNode,
  ForNode,
  FunctionDeclNode,
  GroupNode,
  IfNode,
  ReturnNode,
  VariableDeclNode,
  type FunctionParam,
  type StatementNode,
} from "../ast/nodes/StatementNode.js";
import { AssignmentNode } from "../ast/nodes/AssignmentNode.js";
import { CommandCallNode } from "../ast/nodes/CommandCallNode.js";
import { ArgumentNode } from "../ast/nodes/ArgumentNode.js";
import {
  type BinaryOperator,
  type ValueNode,
  BinaryExprNode,
  HexColorLiteralNode,
  IdentifierValueNode,
  NumberLiteralNode,
  StringLiteralNode,
  UnaryExprNode,
} from "../ast/nodes/ValueNode.js";
import { ParseError } from "./ParseError.js";
import type { DiagnosticCode } from "../diagnostics/DiagnosticCodes.js";

export interface ParseResult {
  readonly program: ProgramNode;
  readonly diagnostics: readonly Diagnostic[];
}

/** Binary operators by precedence, loosest first. All are left-associative. */
const BINARY_LEVELS: readonly (readonly [TokenType, BinaryOperator][])[] = [
  [[TokenType.OrOr, "||"]],
  [[TokenType.AndAnd, "&&"]],
  [
    [TokenType.EqualEqual, "=="],
    [TokenType.BangEqual, "!="],
  ],
  [
    [TokenType.Less, "<"],
    [TokenType.LessEqual, "<="],
    [TokenType.Greater, ">"],
    [TokenType.GreaterEqual, ">="],
  ],
  [
    [TokenType.Plus, "+"],
    [TokenType.Minus, "-"],
  ],
  [
    [TokenType.Star, "*"],
    [TokenType.Slash, "/"],
    [TokenType.Percent, "%"],
  ],
];

const RESERVED_WORDS = Object.keys(KEYWORDS).join(", ");

/**
 * Hand-written recursive-descent parser (see docs/grammar.md). Commands are
 * still generic calls `name(args)` — the parser does not know what
 * `crear_circulo` means; the SemanticAnalyzer does. On a malformed statement
 * it reports one diagnostic and resynchronizes at the next ';' (or the end of
 * the enclosing block) instead of aborting: the user gets every syntax error
 * in one pass.
 */
export class Parser {
  private current = 0;
  private readonly diagnostics: Diagnostic[] = [];

  constructor(private readonly tokens: readonly Token[]) {}

  public parse(): ParseResult {
    const statements = this.parseStatements(false);
    return { program: new ProgramNode(statements), diagnostics: this.diagnostics };
  }

  /** Parses statements until EOF (top level) or the closing '}' (inside a block, not consumed). */
  private parseStatements(inBlock: boolean): StatementNode[] {
    const statements: StatementNode[] = [];
    while (!this.isAtEnd() && !(inBlock && this.check(TokenType.RBrace))) {
      const before = this.current;
      try {
        statements.push(this.parseStatement());
      } catch (error) {
        if (!(error instanceof ParseError)) throw error;
        this.report(error);
        this.synchronize(inBlock);
        // No progress (e.g. a stray '}' or a bad first token): consume it and resync, so we never loop forever.
        if (this.current === before) {
          this.advance();
          this.synchronize(inBlock);
        }
      }
    }
    return statements;
  }

  private report(error: ParseError): void {
    this.diagnostics.push({
      severity: "error",
      code: error.code,
      message: error.message,
      position: error.position,
      ...(error.suggestion ? { suggestion: error.suggestion } : {}),
    });
  }

  private parseStatement(): StatementNode {
    const token = this.peek();
    switch (token.type) {
      case TokenType.Const:
      case TokenType.Let: {
        const decl = this.parseVariableDecl();
        this.expectSemicolon();
        return decl;
      }
      case TokenType.Function:
        return this.parseFunction();
      case TokenType.For:
        return this.parseFor();
      case TokenType.If:
        return this.parseIf();
      case TokenType.Group:
        return this.parseGroup();
      case TokenType.Return:
        return this.parseReturn();
      case TokenType.LBrace:
        return this.parseBlock();
      default:
        break;
    }

    const isAssignment = this.check(TokenType.Identifier) && this.checkNext(TokenType.Equals);
    const statement = isAssignment ? this.parseAssignment() : this.parseCall();
    this.expectSemicolon();
    return statement;
  }

  /** The ';' ends a simple statement. Reported right after the statement, not at the next token (usually on the next line). */
  private expectSemicolon(): void {
    if (this.check(TokenType.Semicolon)) {
      this.advance();
      return;
    }
    const last = this.previous();
    throw new ParseError(
      "SYN-001",
      "Se esperaba ';' al final de la instrucción.",
      { line: last.position.line, column: last.position.column + Math.max(1, last.lexeme.length) },
      "Agrega ';' al final de la línea.",
    );
  }

  private parseVariableDecl(): VariableDeclNode {
    const keyword = this.advance();
    const mutable = keyword.type === TokenType.Let;
    const name = this.expectName(`Se esperaba el nombre de la ${mutable ? "variable" : "constante"}.`);
    this.expect(TokenType.Equals, "SYN-002", "Se esperaba '=' después del nombre.", `Escribe, por ejemplo: ${keyword.lexeme} ${name.lexeme} = 10;`);
    const init = this.parseExpression();
    return new VariableDeclNode(name.lexeme, mutable, init, name.position, this.spanFrom(keyword));
  }

  private parseAssignment(): AssignmentNode {
    const identifier = this.advance();
    this.expect(TokenType.Equals, "SYN-002", "Se esperaba '=' después del identificador.");
    const value = this.parseExpression();
    return new AssignmentNode(identifier.lexeme, value, identifier.position, this.spanFrom(identifier));
  }

  private parseFunction(): FunctionDeclNode {
    const keyword = this.advance();
    const name = this.expectName("Se esperaba el nombre de la función.");
    this.expect(TokenType.LParen, "SYN-004", "Se esperaba '(' después del nombre de la función.");
    const params: FunctionParam[] = [];
    if (!this.check(TokenType.RParen)) {
      do {
        const param = this.expectName("Se esperaba el nombre de un parámetro.");
        params.push({ name: param.lexeme, position: param.position });
      } while (this.match(TokenType.Comma));
    }
    this.expect(TokenType.RParen, "SYN-005", "Se esperaba ')' para cerrar los parámetros.");
    const body = this.parseBlock();
    return new FunctionDeclNode(name.lexeme, params, body, name.position, this.spanFrom(keyword));
  }

  private parseFor(): ForNode {
    const keyword = this.advance();
    this.expect(TokenType.LParen, "SYN-011", "Se esperaba '(' después de 'para'.", "Escribe: para (let i = 0; i < 10; i = i + 1) { ... }");

    let init: VariableDeclNode | AssignmentNode | null = null;
    if (!this.check(TokenType.Semicolon)) {
      init = this.check(TokenType.Let) ? this.parseVariableDecl() : this.parseHeaderAssignment();
    }
    this.expect(TokenType.Semicolon, "SYN-011", "Se esperaba ';' después de la inicialización del 'para'.");

    const condition = this.check(TokenType.Semicolon) ? null : this.parseExpression();
    this.expect(TokenType.Semicolon, "SYN-011", "Se esperaba ';' después de la condición del 'para'.");

    const update = this.check(TokenType.RParen) ? null : this.parseHeaderAssignment();
    this.expect(TokenType.RParen, "SYN-005", "Se esperaba ')' para cerrar la cabecera del 'para'.");

    const body = this.parseBlock();
    return new ForNode(init, condition, update, body, keyword.position, this.spanFrom(keyword));
  }

  private parseHeaderAssignment(): AssignmentNode {
    if (!(this.check(TokenType.Identifier) && this.checkNext(TokenType.Equals))) {
      throw new ParseError("SYN-011", "Se esperaba una asignación, por ejemplo i = i + 1.", this.peek().position);
    }
    return this.parseAssignment();
  }

  private parseIf(): IfNode {
    const keyword = this.advance();
    this.expect(TokenType.LParen, "SYN-004", "Se esperaba '(' después de 'si'.", "Escribe: si (condicion) { ... }");
    const condition = this.parseExpression();
    this.expect(TokenType.RParen, "SYN-005", "Se esperaba ')' para cerrar la condición.");
    const thenBlock = this.parseBlock();
    let elseBranch: BlockNode | IfNode | null = null;
    if (this.match(TokenType.Else)) {
      elseBranch = this.check(TokenType.If) ? this.parseIf() : this.parseBlock();
    }
    return new IfNode(condition, thenBlock, elseBranch, keyword.position, this.spanFrom(keyword));
  }

  private parseGroup(): GroupNode {
    const keyword = this.advance();
    this.expect(TokenType.LParen, "SYN-004", "Se esperaba '(' después de 'grupo'.", "Escribe: grupo(x=0, y=0, escala=1) { ... }");
    const args = this.parseArguments();
    const close = this.expect(TokenType.RParen, "SYN-005", "Se esperaba ')' para cerrar los argumentos.");
    const body = this.parseBlock();
    return new GroupNode(args, body, keyword.position, this.spanFrom(keyword), close.offset);
  }

  private parseReturn(): ReturnNode {
    const keyword = this.advance();
    const value = this.check(TokenType.Semicolon) ? null : this.parseExpression();
    const node = new ReturnNode(value, keyword.position, this.spanFrom(keyword));
    this.expectSemicolon();
    return node;
  }

  private parseBlock(): BlockNode {
    const open = this.expect(TokenType.LBrace, "SYN-007", "Se esperaba '{' para abrir el bloque.", "Abre el bloque con '{' y ciérralo con '}'.");
    const statements = this.parseStatements(true);
    if (!this.check(TokenType.RBrace)) {
      throw new ParseError("SYN-008", "Falta '}' para cerrar el bloque.", open.position, "Cierra el bloque con '}'.");
    }
    this.advance();
    return new BlockNode(statements, open.position, this.spanFrom(open));
  }

  private parseCall(): CommandCallNode {
    const nameToken = this.expect(
      TokenType.Identifier,
      "SYN-003",
      "Se esperaba el nombre de un comando.",
      "Empieza la instrucción con un comando, por ejemplo crear_circulo(...).",
    );
    this.expect(TokenType.LParen, "SYN-004", "Se esperaba '(' después del nombre del comando.");
    const args = this.parseArguments();
    this.expect(
      TokenType.RParen,
      "SYN-005",
      "Se esperaba ')' para cerrar los argumentos.",
      "Separa los argumentos con ',' y cierra con ')'.",
    );
    return new CommandCallNode(nameToken.lexeme, args, nameToken.position, this.spanFrom(nameToken));
  }

  private parseArguments(): ArgumentNode[] {
    const args: ArgumentNode[] = [];
    if (!this.check(TokenType.RParen)) {
      args.push(this.parseArgument());
      while (this.match(TokenType.Comma)) {
        args.push(this.parseArgument());
      }
    }
    return args;
  }

  private parseArgument(): ArgumentNode {
    const first = this.peek();
    const isNamed = this.check(TokenType.Identifier) && this.checkNext(TokenType.Equals);
    if (isNamed) {
      this.advance(); // name
      this.advance(); // '='
      const value = this.parseExpression();
      return new ArgumentNode(first.lexeme, value, first.position, this.spanFrom(first));
    }
    const value = this.parseExpression();
    return new ArgumentNode(null, value, first.position, this.spanFrom(first));
  }

  // ---- expressions (precedence climbing) ----

  private parseExpression(): ValueNode {
    return this.parseBinary(0);
  }

  private parseBinary(level: number): ValueNode {
    if (level >= BINARY_LEVELS.length) return this.parseUnary();
    let left = this.parseBinary(level + 1);
    for (;;) {
      const operator = BINARY_LEVELS[level]!.find(([type]) => this.check(type));
      if (!operator) return left;
      const operatorToken = this.advance();
      const right = this.parseBinary(level + 1);
      left = new BinaryExprNode(operator[1], left, right, operatorToken.position, {
        start: left.span.start,
        end: right.span.end,
      });
    }
  }

  private parseUnary(): ValueNode {
    if (this.check(TokenType.Minus)) {
      const minus = this.advance();
      // `-5` stays a plain literal, so visual edits can rewrite it in place.
      if (this.check(TokenType.Number)) {
        const number = this.advance();
        return new NumberLiteralNode(-Number.parseFloat(number.lexeme), minus.position, this.spanFrom(minus));
      }
      const operand = this.parseUnary();
      return new UnaryExprNode("-", operand, minus.position, { start: minus.offset, end: operand.span.end });
    }
    if (this.check(TokenType.Bang)) {
      const bang = this.advance();
      const operand = this.parseUnary();
      return new UnaryExprNode("!", operand, bang.position, { start: bang.offset, end: operand.span.end });
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ValueNode {
    const token = this.peek();
    switch (token.type) {
      case TokenType.Number:
        this.advance();
        return new NumberLiteralNode(Number.parseFloat(token.lexeme), token.position, this.spanFrom(token));
      case TokenType.String:
        this.advance();
        return new StringLiteralNode(token.lexeme, token.position, this.spanFrom(token));
      case TokenType.HexColor:
        this.advance();
        return new HexColorLiteralNode(token.lexeme, token.position, this.spanFrom(token));
      case TokenType.Identifier:
        if (this.checkNext(TokenType.LParen)) return this.parseCall();
        this.advance();
        return new IdentifierValueNode(token.lexeme, token.position, this.spanFrom(token));
      case TokenType.LParen: {
        this.advance();
        const inner = this.parseExpression();
        this.expect(TokenType.RParen, "SYN-005", "Se esperaba ')' para cerrar la expresión.");
        return inner;
      }
      default:
        throw new ParseError(
          "SYN-006",
          "Se esperaba un valor (número, color, texto o identificador).",
          token.position,
          "Completa el argumento, por ejemplo radio=50.",
        );
    }
  }

  // ---- helpers ----

  /** An identifier that is also not a reserved word (reserved words get their own, clearer error). */
  private expectName(message: string): Token {
    const token = this.peek();
    if (token.type === TokenType.Identifier) return this.advance();
    if (Object.values(KEYWORDS).includes(token.type)) {
      throw new ParseError(
        "SYN-010",
        `'${token.lexeme}' es una palabra reservada y no puede usarse como nombre.`,
        token.position,
        `Palabras reservadas: ${RESERVED_WORDS}. Elige otro nombre.`,
      );
    }
    throw new ParseError("SYN-012", message, token.position);
  }

  /** Span from `first` through the last consumed token. */
  private spanFrom(first: Token): Span {
    const last = this.previous();
    return { start: first.offset, end: last.offset + last.length };
  }

  /** Skips to just after the next ';', or stops before the '}' that closes the current block. */
  private synchronize(inBlock: boolean): void {
    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.Semicolon) return;
      if (inBlock && this.check(TokenType.RBrace)) return;
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
    return this.tokens[Math.max(0, this.current - 1)]!;
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.Eof;
  }
}
