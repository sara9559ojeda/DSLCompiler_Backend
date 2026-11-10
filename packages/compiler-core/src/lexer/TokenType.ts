export enum TokenType {
  Identifier = "IDENTIFIER",
  Number = "NUMBER",
  String = "STRING",
  HexColor = "HEX_COLOR",
  Equals = "EQUALS",
  LParen = "LPAREN",
  RParen = "RPAREN",
  LBrace = "LBRACE",
  RBrace = "RBRACE",
  Comma = "COMMA",
  Semicolon = "SEMICOLON",
  Plus = "PLUS",
  Minus = "MINUS",
  Star = "STAR",
  Slash = "SLASH",
  Percent = "PERCENT",
  Less = "LESS",
  LessEqual = "LESS_EQUAL",
  Greater = "GREATER",
  GreaterEqual = "GREATER_EQUAL",
  EqualEqual = "EQUAL_EQUAL",
  BangEqual = "BANG_EQUAL",
  Bang = "BANG",
  AndAnd = "AND_AND",
  OrOr = "OR_OR",
  // Reserved words
  Const = "KW_CONST",
  Let = "KW_LET",
  Function = "KW_FUNCION",
  For = "KW_PARA",
  If = "KW_SI",
  Else = "KW_SINO",
  Return = "KW_RETORNAR",
  Group = "KW_GRUPO",
  Diagram = "KW_DIAGRAMA",
  Eof = "EOF",
}

/** Reserved words of the language. Anything else that looks like a name is an Identifier. */
export const KEYWORDS: Readonly<Record<string, TokenType>> = {
  const: TokenType.Const,
  let: TokenType.Let,
  funcion: TokenType.Function,
  para: TokenType.For,
  si: TokenType.If,
  sino: TokenType.Else,
  retornar: TokenType.Return,
  grupo: TokenType.Group,
  diagrama: TokenType.Diagram,
};

/**
 * The token type for a name: its keyword if it is reserved, Identifier
 * otherwise. Uses an own-property check so names such as `constructor` or
 * `toString` are not mistaken for keywords through Object.prototype.
 */
export function tokenTypeForName(name: string): TokenType {
  return Object.hasOwn(KEYWORDS, name) ? KEYWORDS[name]! : TokenType.Identifier;
}
