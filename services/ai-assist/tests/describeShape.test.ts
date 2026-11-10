import { describe, expect, it } from "vitest";
import { SHAPE_DEFINITIONS, type ShapeDefinition } from "@saramariaojeda9559/compiler-core";
import { describeShape } from "../src/prompts/describeShape.js";

describe("describeShape", () => {
  it("lists required and optional parameters with their defaults", () => {
    const definition = {
      name: "crear_punto",
      category: "shape",
      params: [
        { name: "x", type: "number", required: true },
        { name: "color", type: "color", required: false, defaultValue: "#000000" },
      ],
    } as unknown as ShapeDefinition;

    expect(describeShape(definition)).toBe('- crear_punto(x: number (requerido), color: color (opcional, por defecto "#000000"))');
  });

  it("includes the allowed values when a parameter is an enum", () => {
    const definition = {
      name: "conectar",
      category: "shape",
      params: [{ name: "tipo", type: "string", required: false, defaultValue: "linea", allowedValues: ["linea", "flecha"] }],
    } as unknown as ShapeDefinition;

    expect(describeShape(definition)).toContain("valores válidos: linea|flecha");
  });

  it("describes every command in the live registry on its own line", () => {
    for (const definition of SHAPE_DEFINITIONS) {
      const line = describeShape(definition);
      expect(line.startsWith(`- ${definition.name}(`)).toBe(true);
      expect(line).not.toContain("\n");
    }
  });
});
