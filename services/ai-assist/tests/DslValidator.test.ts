import { describe, expect, it } from "vitest";
import { DslValidator } from "../src/validation/DslValidator.js";

describe("DslValidator", () => {
  const validator = new DslValidator();

  it("accepts a valid program and returns its SVG preview", () => {
    const result = validator.validate("c1 = crear_circulo(radio=10, x=50, y=50, color=rojo);");
    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.svg).toContain("<circle");
  });

  it("rejects an invalid program with the compiler's diagnostics", () => {
    const result = validator.validate("c1 = crear_circulo(x=50, y=50);");
    expect(result.success).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("SEM-009");
  });

  it("rejects a program that never ends instead of hanging", () => {
    const result = validator.validate("para (let i = 0; i < 1; i = i) { crear_circulo(radio=1, x=0, y=0); }");
    expect(result.success).toBe(false);
  });
});
