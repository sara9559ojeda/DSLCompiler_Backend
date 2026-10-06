import { describe, expect, it } from "vitest";
import { Lexer } from "../src/lexer/Lexer.js";
import { TokenType } from "../src/lexer/TokenType.js";

describe("Lexer", () => {
  it("tokenizes a full command call with named arguments", () => {
    const { tokens, diagnostics } = new Lexer(
      "c1 = crear_circulo(radio=50, color=rojo, x=100, y=-20.5);",
    ).tokenize();

    expect(diagnostics).toHaveLength(0);
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.Identifier, // c1
      TokenType.Equals,
      TokenType.Identifier, // crear_circulo
      TokenType.LParen,
      TokenType.Identifier, // radio
      TokenType.Equals,
      TokenType.Number, // 50
      TokenType.Comma,
      TokenType.Identifier, // color
      TokenType.Equals,
      TokenType.Identifier, // rojo
      TokenType.Comma,
      TokenType.Identifier, // x
      TokenType.Equals,
      TokenType.Number, // 100
      TokenType.Comma,
      TokenType.Identifier, // y
      TokenType.Equals,
      TokenType.Number, // -20.5
      TokenType.RParen,
      TokenType.Semicolon,
      TokenType.Eof,
    ]);
  });

  it("parses negative and decimal numbers into a single token", () => {
    const { tokens } = new Lexer("-20.5").tokenize();
    expect(tokens[0]?.type).toBe(TokenType.Number);
    expect(tokens[0]?.lexeme).toBe("-20.5");
  });

  it("recognizes hex colors", () => {
    const { tokens, diagnostics } = new Lexer("#ff00aa").tokenize();
    expect(diagnostics).toHaveLength(0);
    expect(tokens[0]?.type).toBe(TokenType.HexColor);
    expect(tokens[0]?.lexeme).toBe("#ff00aa");
  });

  it("recognizes quoted strings", () => {
    const { tokens } = new Lexer('"hola mundo"').tokenize();
    expect(tokens[0]?.type).toBe(TokenType.String);
    expect(tokens[0]?.lexeme).toBe("hola mundo");
  });

  it("ignores line comments", () => {
    const { tokens } = new Lexer("// esto es un comentario\nx").tokenize();
    expect(tokens.map((t) => t.type)).toEqual([TokenType.Identifier, TokenType.Eof]);
  });

  it("reports an unterminated string as a diagnostic instead of throwing", () => {
    const { diagnostics } = new Lexer('"sin cerrar').tokenize();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.severity).toBe("error");
  });

  it("reports an unexpected character but keeps tokenizing", () => {
    const { tokens, diagnostics } = new Lexer("x @ y").tokenize();
    expect(diagnostics).toHaveLength(1);
    expect(tokens.map((t) => t.type)).toEqual([TokenType.Identifier, TokenType.Identifier, TokenType.Eof]);
  });

  it("tracks line and column numbers", () => {
    const { tokens } = new Lexer("a\nb").tokenize();
    expect(tokens[0]?.position).toEqual({ line: 1, column: 1 });
    expect(tokens[1]?.position).toEqual({ line: 2, column: 1 });
  });
});
