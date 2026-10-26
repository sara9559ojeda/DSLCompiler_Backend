import { describe, expect, it } from "vitest";
import { createDefaultPipeline, closestMatch, DIAGNOSTIC_CODES } from "../src/index.js";

const firstDiagnostic = (source: string) => createDefaultPipeline().compile(source).diagnostics[0]!;

describe("Rich diagnostics (code + snippet + suggestion)", () => {
  it("suggests the closest command for a typo (SEM-004)", () => {
    const diagnostic = firstDiagnostic("c1 = crear_circlo(radio=10, x=0, y=0);");
    expect(diagnostic).toMatchObject({
      code: "SEM-004",
      suggestion: "¿Quisiste decir 'crear_circulo'?",
      snippet: "c1 = crear_circlo(radio=10, x=0, y=0);",
    });
  });

  it("tells exactly what to add for a missing required parameter (SEM-009)", () => {
    const diagnostic = firstDiagnostic("crear_circulo(x=0, y=0);");
    expect(diagnostic.code).toBe("SEM-009");
    expect(diagnostic.suggestion).toBe("Agrega radio=50 dentro de los paréntesis.");
  });

  it("suggests the closest parameter name (SEM-008)", () => {
    expect(firstDiagnostic("crear_circulo(radios=5, x=0, y=0);")).toMatchObject({
      code: "SEM-008",
      suggestion: "¿Quisiste decir 'radio'?",
    });
  });

  it("suggests the closest named color (SEM-012)", () => {
    expect(firstDiagnostic("crear_circulo(radio=5, x=0, y=0, color=rjo);")).toMatchObject({
      code: "SEM-012",
      suggestion: "¿Quisiste decir 'rojo'?",
    });
  });

  it("suggests a declared shape for a mistyped reference (SEM-013)", () => {
    const source = "casa = crear_rectangulo(ancho=5, alto=5, x=0, y=0);\nsol = crear_circulo(radio=5, x=50, y=0);\nconectar(cas, sol);";
    expect(firstDiagnostic(source)).toMatchObject({ code: "SEM-013", suggestion: "¿Quisiste decir 'casa'?" });
  });

  it("proposes a free name for a duplicate identifier (SEM-002)", () => {
    const source = "c = crear_circulo(radio=5, x=0, y=0);\nc = crear_circulo(radio=5, x=9, y=9);";
    expect(firstDiagnostic(source)).toMatchObject({ code: "SEM-002", suggestion: "Usa otro nombre, por ejemplo 'c2'." });
  });

  it("points a missing ';' at the end of the offending line, not the next one (SYN-001)", () => {
    const diagnostic = firstDiagnostic("c1 = crear_circulo(radio=5, x=0, y=0)\nc2 = crear_circulo(radio=5, x=9, y=9);");
    expect(diagnostic).toMatchObject({ code: "SYN-001", position: { line: 1, column: 38 } });
    expect(diagnostic.snippet).toBe("c1 = crear_circulo(radio=5, x=0, y=0)");
  });

  it("recommends double quotes for a single-quoted text (LEX-001)", () => {
    expect(firstDiagnostic("crear_texto(contenido='hola', x=0, y=0);")).toMatchObject({
      code: "LEX-001",
      suggestion: 'Usa comillas dobles (") para el texto.',
    });
  });

  it("every emitted code exists in the catalog", () => {
    const sources = ["@", "crear_circulo(", "x = conectar(a, b);", "crear_circulo(1,2,3,rojo,5);"];
    for (const source of sources) {
      for (const diagnostic of createDefaultPipeline().compile(source).diagnostics) {
        expect(DIAGNOSTIC_CODES).toHaveProperty(diagnostic.code);
      }
    }
  });

  it("closestMatch ignores candidates that are too far to be a typo", () => {
    expect(closestMatch("zzz", ["rojo", "azul"])).toBeUndefined();
  });
});
