import { describe, expect, it } from "vitest";
import { SHAPE_DEFINITIONS } from "@compiler-img/compiler-core";
import { buildGrammarContext } from "../src/prompts/buildGrammarContext.js";

describe("buildGrammarContext", () => {
  it("mentions every command currently registered in the shared ShapeRegistry", () => {
    const context = buildGrammarContext();
    for (const definition of SHAPE_DEFINITIONS) {
      expect(context).toContain(definition.name);
    }
  });

  it("mentions every parameter of every command", () => {
    const context = buildGrammarContext();
    for (const definition of SHAPE_DEFINITIONS) {
      for (const param of definition.params) {
        expect(context).toContain(param.name);
      }
    }
  });
});
