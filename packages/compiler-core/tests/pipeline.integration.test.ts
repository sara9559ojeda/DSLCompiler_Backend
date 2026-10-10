import { describe, expect, it } from "vitest";
import { createDefaultPipeline } from "../src/index.js";

describe("CompilerPipeline (integration)", () => {
  it("compiles a valid DSL program end to end into an SVG document", () => {
    const source = `
      c1 = crear_circulo(radio=50, color=rojo, x=100, y=100);
      r1 = crear_rectangulo(ancho=80, alto=40, color=azul, x=200, y=150);
      conectar(c1, r1, tipo=linea);
    `;

    const result = createDefaultPipeline().compile(source);

    expect(result.success).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("<circle");
    expect(result.svg).toContain("<rect");
    expect(result.svg).toContain("<line");
  });

  it("fails the compile and reports diagnostics for an invalid program", () => {
    const source = "crear_circulo(x=1, y=1);"; // missing required 'radio'

    const result = createDefaultPipeline().compile(source);

    expect(result.success).toBe(false);
    expect(result.svg).toBeNull();
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("accumulates diagnostics from lexer, parser and semantic phases together", () => {
    const source = 'c1 = crear_circulo(radio=1, x=0, y=0, color=@);'; // '@' is an invalid character

    const result = createDefaultPipeline().compile(source);

    expect(result.success).toBe(false);
    expect(result.diagnostics.some((d) => d.message.includes("inesperado"))).toBe(true);
  });
});
