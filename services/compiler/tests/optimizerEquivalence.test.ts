import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { createDefaultPipeline } from "@saramariaojeda9559/compiler-core";

/** Rasterizes an SVG to raw RGBA pixels. */
async function pixels(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
}

const PROGRAMS: Record<string, string> = {
  "off-canvas + degenerate shapes": [
    "crear_rectangulo(ancho=800, alto=600, x=0, y=0, color=blanco);",
    "crear_circulo(radio=40, x=-100, y=300, color=rojo);",
    "crear_rectangulo(ancho=50, alto=50, x=850, y=10, color=azul);",
    "crear_circulo(radio=0, x=100, y=100, color=verde);",
    "crear_linea(x1=10, y1=10, x2=10, y2=10, color=negro);",
    "crear_circulo(radio=60, x=400, y=300, color=amarillo);",
  ].join("\n"),
  "occluded shapes, with partly-covered and translucent cases around them": [
    "crear_circulo(radio=40, x=200, y=200, color=rojo);",
    "crear_linea(x1=160, y1=160, x2=240, y2=240, color=negro);",
    "crear_circulo(radio=40, x=330, y=200, color=verde);",
    "crear_circulo(radio=20, x=560, y=200, color=morado);",
    "crear_rectangulo(ancho=200, alto=200, x=130.5, y=100.5, color=azul);",
    "crear_rectangulo(ancho=150, alto=150, x=480, y=120, color=#ffaa0080);",
    "a = crear_circulo(radio=10, x=200, y=150, color=gris);",
    "b = crear_rectangulo(ancho=20, alto=20, x=600, y=450, color=naranja);",
    "conectar(a, b, tipo=flecha, color=negro);",
  ].join("\n"),
};

/** The optimizer's contract: optimized output renders to exactly the same pixels. */
describe("Scene optimizer — visual equivalence", () => {
  for (const [name, source] of Object.entries(PROGRAMS)) {
    it(`renders identically: ${name}`, async () => {
      const plain = createDefaultPipeline().compile(source).svg!;
      const stages = createDefaultPipeline({ optimize: true }).compileWithStages(source);
      const removed = stages.optimization!.reduce((sum, report) => sum + report.removedShapes, 0);

      expect(removed).toBeGreaterThan(0);
      expect(stages.result.svg!.length).toBeLessThan(plain.length);
      expect((await pixels(stages.result.svg!)).equals(await pixels(plain))).toBe(true);
    });
  }
});
