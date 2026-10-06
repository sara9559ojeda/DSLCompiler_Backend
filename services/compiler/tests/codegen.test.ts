import { describe, expect, it } from "vitest";
import { SvgShapeRenderer } from "../src/codegen/SvgShapeRenderer.js";
import { CodeGenerator } from "../src/codegen/CodeGenerator.js";
import type { Scene } from "../src/semantic/Scene.js";

describe("SvgShapeRenderer + CodeGenerator", () => {
  const renderer = new SvgShapeRenderer();
  const generator = new CodeGenerator(renderer);

  it("renders a circle", () => {
    const scene: Scene = {
      canvas: { width: 200, height: 200 },
      shapes: [{ id: "c1", kind: "crear_circulo", params: { radio: 50, x: 100, y: 100, color: "#ff0000" } }],
      connections: [],
    };
    const svg = generator.generate(scene);
    expect(svg).toContain("<svg");
    expect(svg).toContain('<circle cx="100" cy="100" r="50" fill="#ff0000" />');
  });

  it("renders a rectangle and a line connecting two shapes", () => {
    const scene: Scene = {
      canvas: { width: 400, height: 400 },
      shapes: [
        { id: "c1", kind: "crear_circulo", params: { radio: 10, x: 0, y: 0, color: "#000000" } },
        { id: "r1", kind: "crear_rectangulo", params: { ancho: 20, alto: 10, x: 100, y: 100, color: "#000000" } },
      ],
      connections: [{ fromId: "c1", toId: "r1", params: { tipo: "linea", color: "#000000" } }],
    };
    const svg = generator.generate(scene);
    expect(svg).toContain('<rect x="100" y="100" width="20" height="10" fill="#000000" />');
    // rectangle anchor is its center: (100 + 20/2, 100 + 10/2) = (110, 105)
    expect(svg).toContain('<line x1="0" y1="0" x2="110" y2="105"');
  });

  it("adds an arrowhead polygon when the connection type is 'flecha'", () => {
    const scene: Scene = {
      canvas: { width: 100, height: 100 },
      shapes: [
        { id: "a", kind: "crear_circulo", params: { radio: 5, x: 0, y: 0, color: "#000000" } },
        { id: "b", kind: "crear_circulo", params: { radio: 5, x: 50, y: 0, color: "#000000" } },
      ],
      connections: [{ fromId: "a", toId: "b", params: { tipo: "flecha", color: "#000000" } }],
    };
    const svg = generator.generate(scene);
    expect(svg).toContain("<polygon");
  });

  it("escapes text content", () => {
    const scene: Scene = {
      canvas: { width: 100, height: 100 },
      shapes: [
        { id: "t1", kind: "crear_texto", params: { contenido: "<script>", x: 0, y: 0, color: "#000000", tamano: 16 } },
      ],
      connections: [],
    };
    const svg = generator.generate(scene);
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toContain("<script>");
  });
});
