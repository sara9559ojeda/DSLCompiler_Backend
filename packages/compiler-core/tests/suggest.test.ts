import { describe, expect, it } from "vitest";
import { closestMatch, didYouMean, editDistance } from "../src/diagnostics/suggest.js";

describe("editDistance", () => {
  it("is zero for identical words", () => {
    expect(editDistance("radio", "radio")).toBe(0);
  });

  it("counts one insertion, deletion or substitution as 1", () => {
    expect(editDistance("radio", "radios")).toBe(1);
    expect(editDistance("radio", "rado")).toBe(1);
    expect(editDistance("radio", "radia")).toBe(1);
  });

  it("equals the other word's length when one side is empty", () => {
    expect(editDistance("", "alto")).toBe(4);
    expect(editDistance("alto", "")).toBe(4);
  });

  it("is symmetric", () => {
    expect(editDistance("crear_circulo", "crear_circlo")).toBe(editDistance("crear_circlo", "crear_circulo"));
  });
});

describe("closestMatch", () => {
  const commands = ["crear_circulo", "crear_rectangulo", "crear_texto"];

  it("finds the command a typo was meant to be", () => {
    expect(closestMatch("crear_circlo", commands)).toBe("crear_circulo");
  });

  it("ignores case", () => {
    expect(closestMatch("CREAR_TEXTO", commands)).toBe("crear_texto");
  });

  it("returns nothing when no candidate is close enough to be a typo", () => {
    expect(closestMatch("dibujar", commands)).toBeUndefined();
  });

  it("allows at least one edit even for very short words", () => {
    expect(closestMatch("x", ["y"])).toBe("y");
  });

  it("prefers the candidate with the smallest distance", () => {
    expect(closestMatch("crear_circlo", ["crear_circulos", "crear_circulo"])).toBe("crear_circulo");
  });

  it("keeps the first candidate when two are equally close", () => {
    expect(closestMatch("rojp", ["roja", "rojo"])).toBe("roja");
  });

  it("returns nothing for an empty candidate list", () => {
    expect(closestMatch("rojo", [])).toBeUndefined();
  });
});

describe("didYouMean", () => {
  it("phrases a suggestion for the user", () => {
    expect(didYouMean("rojo")).toBe("¿Quisiste decir 'rojo'?");
  });

  it("returns nothing when there is no candidate", () => {
    expect(didYouMean(undefined)).toBeUndefined();
  });
});
