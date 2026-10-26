import { describe, expect, it } from "vitest";
import { createDefaultPipeline } from "../src/index.js";

describe("CompilerPipeline.compileWithStages", () => {
  it("returns every intermediate artifact plus a timing per phase", () => {
    const stages = createDefaultPipeline().compileWithStages("c1 = crear_circulo(radio=10, x=20, y=20);");

    expect(stages.result.success).toBe(true);
    expect(stages.tokens.at(-1)?.type).toBe("EOF");
    expect(stages.program.statements).toHaveLength(1);
    expect(stages.scene.shapes[0]?.kind).toBe("crear_circulo");
    expect(stages.timings.map((timing) => timing.stage)).toEqual(["lexer", "parser", "semantic", "codegen"]);
    expect(stages.timings.every((timing) => timing.durationMs >= 0)).toBe(true);
  });

  it("skips codegen (no svg, no codegen timing) when there are errors", () => {
    const stages = createDefaultPipeline().compileWithStages("crear_circulo(x=0, y=0);");

    expect(stages.result).toMatchObject({ success: false, svg: null });
    expect(stages.timings.map((timing) => timing.stage)).toEqual(["lexer", "parser", "semantic"]);
  });

  it("compile() stays identical to the result inside compileWithStages()", () => {
    const source = "r = crear_rectangulo(ancho=10, alto=10, x=0, y=0, color=azul);";
    const pipeline = createDefaultPipeline();
    expect(pipeline.compile(source)).toEqual(pipeline.compileWithStages(source).result);
  });
});
