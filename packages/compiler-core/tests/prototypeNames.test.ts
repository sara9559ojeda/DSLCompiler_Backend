import { describe, expect, it } from "vitest";
import { createDefaultPipeline } from "../src/index.js";
import { tokenTypeForName, TokenType } from "../src/lexer/TokenType.js";

/** Names that exist on Object.prototype and used to leak into keyword and color lookups. */
const PROTOTYPE_NAMES = ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__"];

describe("names that exist on Object.prototype", () => {
  it.each(PROTOTYPE_NAMES)("lexes '%s' as an identifier, not a keyword", (name) => {
    expect(tokenTypeForName(name)).toBe(TokenType.Identifier);
  });

  it("still recognises real keywords", () => {
    expect(tokenTypeForName("para")).toBe(TokenType.For);
  });

  it.each(PROTOTYPE_NAMES)("accepts '%s' as a variable name", (name) => {
    const result = createDefaultPipeline().compile(`${name} = crear_circulo(radio=10, x=0, y=0);`);
    expect(result.diagnostics).toEqual([]);
  });

  it.each(PROTOTYPE_NAMES)("rejects '%s' as a color with a semantic error, not a syntax error", (name) => {
    const result = createDefaultPipeline().compile(`crear_circulo(radio=10, x=0, y=0, color=${name});`);
    expect(result.success).toBe(false);
    expect(result.diagnostics[0]?.code).toMatch(/^SEM-/);
  });
});
