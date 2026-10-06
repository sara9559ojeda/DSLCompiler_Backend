import { describe, expect, it } from "vitest";
import { SHAPE_DEFINITIONS, NAMED_COLORS, DEFAULT_SHAPE_COLOR } from "@compiler-img/shared";
import { Lexer } from "../src/lexer/Lexer.js";
import { Parser } from "../src/parser/Parser.js";
import { SemanticAnalyzer } from "../src/semantic/SemanticAnalyzer.js";
import { DefaultShapeRegistry } from "../src/semantic/ShapeRegistry.js";
import { ColorResolver } from "../src/semantic/ColorResolver.js";

function analyze(source: string) {
  const { tokens } = new Lexer(source).tokenize();
  const { program } = new Parser(tokens).parse();
  const registry = new DefaultShapeRegistry(SHAPE_DEFINITIONS);
  const colorResolver = new ColorResolver(NAMED_COLORS);
  return new SemanticAnalyzer(registry, colorResolver).analyze(program);
}

describe("SemanticAnalyzer", () => {
  it("resolves a valid program into shapes and connections", () => {
    const { scene, diagnostics } = analyze(
      `c1 = crear_circulo(radio=50, color=rojo, x=100, y=100);
       r1 = crear_rectangulo(ancho=80, alto=40, color=azul, x=200, y=150);
       conectar(c1, r1, tipo=linea);`,
    );

    expect(diagnostics).toHaveLength(0);
    expect(scene.shapes).toHaveLength(2);
    expect(scene.shapes[0]).toMatchObject({ id: "c1", kind: "crear_circulo", params: { color: NAMED_COLORS.rojo } });
    expect(scene.connections).toHaveLength(1);
    expect(scene.connections[0]).toMatchObject({ fromId: "c1", toId: "r1", params: { tipo: "linea" } });
  });

  it("applies default values for omitted optional parameters", () => {
    const { scene, diagnostics } = analyze("c1 = crear_circulo(radio=10, x=0, y=0);");
    expect(diagnostics).toHaveLength(0);
    expect(scene.shapes[0]?.params.color).toBe(DEFAULT_SHAPE_COLOR);
  });

  it("reports a missing required parameter", () => {
    const { diagnostics } = analyze("c1 = crear_circulo(x=0, y=0);");
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toMatch(/radio/);
  });

  it("reports an unknown color", () => {
    const { diagnostics } = analyze("c1 = crear_circulo(radio=1, x=0, y=0, color=turquesa);");
    expect(diagnostics.some((d) => d.message.includes("turquesa"))).toBe(true);
  });

  it("reports an unknown command", () => {
    const { diagnostics } = analyze("dibujar_estrella(x=0, y=0);");
    expect(diagnostics[0]?.message).toMatch(/Comando desconocido/);
  });

  it("reports a duplicate identifier", () => {
    const { diagnostics } = analyze(
      "c1 = crear_circulo(radio=1, x=0, y=0);\nc1 = crear_circulo(radio=2, x=1, y=1);",
    );
    expect(diagnostics.some((d) => d.message.includes("ya fue declarado"))).toBe(true);
  });

  it("reports a reference to an undeclared shape in conectar", () => {
    const { diagnostics } = analyze("conectar(a, b);");
    expect(diagnostics.some((d) => d.message.includes("no declarada"))).toBe(true);
  });

  it("rejects a connection type outside the allowed values", () => {
    const { diagnostics } = analyze(
      "c1 = crear_circulo(radio=1, x=0, y=0);\nr1 = crear_rectangulo(ancho=1, alto=1, x=0, y=0);\nconectar(c1, r1, tipo=zigzag);",
    );
    expect(diagnostics.some((d) => d.message.includes("Valores válidos"))).toBe(true);
  });

  it("rejects a positional argument written after a named one", () => {
    const { diagnostics } = analyze("c1 = crear_circulo(radio=1, x=0, y=0);\nr1 = crear_circulo(radio=1, color=rojo, 5, y=0);");
    expect(diagnostics.some((d) => d.message.includes("posicionales"))).toBe(true);
  });
});
