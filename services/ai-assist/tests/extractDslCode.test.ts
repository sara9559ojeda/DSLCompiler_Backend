import { describe, expect, it } from "vitest";
import { extractDslCode } from "../src/prompts/extractDslCode.js";

describe("extractDslCode", () => {
  it("returns plain text unchanged", () => {
    expect(extractDslCode("c1 = crear_circulo(radio=1, x=0, y=0);")).toBe(
      "c1 = crear_circulo(radio=1, x=0, y=0);",
    );
  });

  it("strips a fenced code block with a language tag", () => {
    const raw = "```dsl\nc1 = crear_circulo(radio=1, x=0, y=0);\n```";
    expect(extractDslCode(raw)).toBe("c1 = crear_circulo(radio=1, x=0, y=0);");
  });

  it("strips a fenced code block with no language tag", () => {
    const raw = "```\nc1 = crear_circulo(radio=1, x=0, y=0);\n```";
    expect(extractDslCode(raw)).toBe("c1 = crear_circulo(radio=1, x=0, y=0);");
  });

  it("trims surrounding whitespace", () => {
    expect(extractDslCode("  \n c1 = crear_circulo(radio=1, x=0, y=0); \n ")).toBe(
      "c1 = crear_circulo(radio=1, x=0, y=0);",
    );
  });
});
