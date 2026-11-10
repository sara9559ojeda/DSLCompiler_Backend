import { describe, expect, it } from "vitest";
import { SvgExporter } from "../src/export/SvgExporter.js";
import { toAstJson } from "../src/application/toAstJson.js";
import { createDefaultPipeline } from "@saramariaojeda9559/compiler-core";

describe("SvgExporter", () => {
  it("declares the svg format", () => {
    expect(new SvgExporter().format).toBe("svg");
  });

  it("returns the SVG as UTF-8 bytes, keeping non-ASCII text", async () => {
    const svg = "<svg><text>Año ñandú</text></svg>";
    const buffer = await new SvgExporter().export(svg);
    expect(buffer.toString("utf-8")).toBe(svg);
  });
});

describe("toAstJson", () => {
  it("serialises the AST with each node's kind", () => {
    const { program } = createDefaultPipeline().compileWithStages("c1 = crear_circulo(radio=10, x=0, y=0);");
    const json = JSON.parse(toAstJson(program));
    expect(json.kind).toBe("program");
    expect(JSON.stringify(json)).toContain('"kind"');
  });
});
