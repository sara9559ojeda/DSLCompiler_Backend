import type { ShapeDefinition } from "./ShapeDefinition.js";
import { DEFAULT_SHAPE_COLOR } from "./colors.config.js";
import { DEFAULT_FONT_SIZE, DEFAULT_CONNECTION_TYPE, CONNECTION_TYPES } from "./dsl-defaults.config.js";

/**
 * The full catalog of DSL commands. This is the single source of truth for
 * what the language can express: the parser knows nothing about these names,
 * it only builds a generic `command(args)` AST. Adding a new shape or
 * connection type here is enough to make it usable — no parser/lexer change
 * required (Open/Closed principle).
 */
export const SHAPE_DEFINITIONS: readonly ShapeDefinition[] = [
  {
    name: "crear_circulo",
    category: "shape",
    params: [
      { name: "radio", type: "number", required: true },
      { name: "x", type: "number", required: true },
      { name: "y", type: "number", required: true },
      { name: "color", type: "color", required: false, defaultValue: DEFAULT_SHAPE_COLOR },
    ],
  },
  {
    name: "crear_rectangulo",
    category: "shape",
    params: [
      { name: "ancho", type: "number", required: true },
      { name: "alto", type: "number", required: true },
      { name: "x", type: "number", required: true },
      { name: "y", type: "number", required: true },
      { name: "color", type: "color", required: false, defaultValue: DEFAULT_SHAPE_COLOR },
    ],
  },
  {
    name: "crear_linea",
    category: "shape",
    params: [
      { name: "x1", type: "number", required: true },
      { name: "y1", type: "number", required: true },
      { name: "x2", type: "number", required: true },
      { name: "y2", type: "number", required: true },
      { name: "color", type: "color", required: false, defaultValue: DEFAULT_SHAPE_COLOR },
    ],
  },
  {
    name: "crear_texto",
    category: "shape",
    params: [
      { name: "contenido", type: "string", required: true },
      { name: "x", type: "number", required: true },
      { name: "y", type: "number", required: true },
      { name: "color", type: "color", required: false, defaultValue: DEFAULT_SHAPE_COLOR },
      { name: "tamano", type: "number", required: false, defaultValue: DEFAULT_FONT_SIZE },
    ],
  },
  {
    name: "conectar",
    category: "connection",
    params: [
      { name: "origen", type: "shapeRef", required: true },
      { name: "destino", type: "shapeRef", required: true },
      {
        name: "tipo",
        type: "string",
        required: false,
        defaultValue: DEFAULT_CONNECTION_TYPE,
        allowedValues: CONNECTION_TYPES,
      },
      { name: "color", type: "color", required: false, defaultValue: DEFAULT_SHAPE_COLOR },
    ],
  },
];
