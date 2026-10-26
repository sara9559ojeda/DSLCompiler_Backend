import { describe, expect, it } from "vitest";
import { createDefaultPipeline, removeOffCanvasShapes } from "../src/index.js";

const optimized = (source: string) => createDefaultPipeline({ optimize: true }).compileWithStages(source);
const program = (...lines: string[]) => lines.join("\n");

describe("Scene optimizer", () => {
  it("is off by default: compile output is unchanged", () => {
    const stages = createDefaultPipeline().compileWithStages("crear_circulo(radio=0, x=5, y=5);");
    expect(stages.optimizedScene).toBeUndefined();
    expect(stages.result.svg).toContain("<circle");
    expect(stages.timings.map((timing) => timing.stage)).not.toContain("optimizer");
  });

  it("drops shapes entirely outside the canvas", () => {
    const stages = optimized(
      program(
        "crear_circulo(radio=10, x=-50, y=50);",
        "crear_rectangulo(ancho=10, alto=10, x=900, y=0);",
        "crear_circulo(radio=10, x=5, y=5);",
      ),
    );
    expect(stages.optimizedScene?.shapes).toHaveLength(1);
    expect(stages.optimization?.find((report) => report.pass === "remove-off-canvas")?.removedShapes).toBe(2);
  });

  it("keeps a shape that only partly overlaps the canvas", () => {
    expect(optimized("crear_circulo(radio=20, x=-10, y=50);").optimizedScene?.shapes).toHaveLength(1);
  });

  it("drops degenerate shapes (zero radius, empty text, zero-length line)", () => {
    const stages = optimized(
      program(
        "crear_circulo(radio=0, x=5, y=5);",
        'crear_texto(contenido="", x=5, y=5);',
        "crear_linea(x1=3, y1=3, x2=3, y2=3);",
      ),
    );
    expect(stages.optimizedScene?.shapes).toHaveLength(0);
  });

  it("never drops a shape a connection anchors to, even if invisible", () => {
    const stages = optimized(
      program(
        "a = crear_circulo(radio=0, x=10, y=10);",
        "b = crear_circulo(radio=5, x=900, y=10);",
        "c = crear_circulo(radio=5, x=50, y=50);",
        "conectar(a, c);",
        "conectar(b, c);",
      ),
    );
    expect(stages.optimizedScene?.shapes.map((shape) => shape.id)).toEqual(["a", "b", "c"]);
  });

  it("drops shapes fully hidden under a later opaque rectangle", () => {
    const stages = optimized(
      program(
        "crear_circulo(radio=10, x=50, y=50, color=rojo);",
        "crear_linea(x1=20, y1=20, x2=80, y2=80);",
        "crear_rectangulo(ancho=100, alto=100, x=0, y=0, color=azul);",
      ),
    );
    expect(stages.optimizedScene?.shapes.map((shape) => shape.kind)).toEqual(["crear_rectangulo"]);
  });

  it("keeps shapes that are only partly covered, covered by a translucent rectangle, or drawn on top", () => {
    const stages = optimized(
      program(
        "crear_circulo(radio=10, x=95, y=50);", // pokes out of the rectangle
        "crear_circulo(radio=5, x=200, y=50);", // under the translucent one
        "crear_rectangulo(ancho=100, alto=100, x=0, y=0, color=azul);",
        "crear_rectangulo(ancho=100, alto=100, x=150, y=0, color=#ff000080);",
        "crear_circulo(radio=5, x=50, y=50);", // drawn after the rectangle
        'crear_texto(contenido="hola", x=60, y=60);', // unbounded: never removed
      ),
    );
    expect(stages.optimizedScene?.shapes).toHaveLength(6);
  });

  it("can run a custom subset of passes", () => {
    const stages = createDefaultPipeline({ optimize: [removeOffCanvasShapes] }).compileWithStages(
      "crear_circulo(radio=0, x=5, y=5);",
    );
    expect(stages.optimization?.map((report) => report.pass)).toEqual(["remove-off-canvas"]);
    expect(stages.optimizedScene?.shapes).toHaveLength(1);
  });

  it("does not run when the program has errors", () => {
    const stages = optimized("crear_circulo(x=0, y=0);");
    expect(stages.optimizedScene).toBeUndefined();
  });
});
