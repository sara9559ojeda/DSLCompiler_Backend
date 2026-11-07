import type { ShapeDefinition } from "./ShapeDefinition.js";
import { DEFAULT_SHAPE_COLOR } from "./colors.config.js";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_CONNECTION_TYPE,
  CONNECTION_TYPES,
  DEFAULT_OPACITY,
  DEFAULT_ROTATION,
  NODE_TYPES,
  DIRECTIONS,
  DEFAULT_DIAGRAM_SPACING,
  DEFAULT_DIAGRAM_ORIGIN,
} from "./dsl-defaults.config.js";

const OPACITY_PARAM = { name: "opacidad", type: "number", required: false, defaultValue: DEFAULT_OPACITY } as const;
const ROTATION_PARAM = { name: "rotacion", type: "number", required: false, defaultValue: DEFAULT_ROTATION } as const;

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
      OPACITY_PARAM,
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
      OPACITY_PARAM,
      ROTATION_PARAM,
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
      OPACITY_PARAM,
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
      OPACITY_PARAM,
      ROTATION_PARAM,
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
      // Only meaningful between two diagram nodes: a caption drawn at the middle of the line.
      { name: "etiqueta", type: "string", required: false },
    ],
  },
  {
    // Valid only inside `diagrama { }`. x/y/ancho/alto have no default on purpose: absent means "let the layout decide".
    name: "nodo",
    category: "node",
    params: [
      { name: "etiqueta", type: "string", required: true },
      { name: "tipo", type: "string", required: false, allowedValues: NODE_TYPES },
      { name: "color", type: "color", required: false, defaultValue: "#1e88e5" },
      { name: "x", type: "number", required: false },
      { name: "y", type: "number", required: false },
      { name: "ancho", type: "number", required: false },
      { name: "alto", type: "number", required: false },
      OPACITY_PARAM,
    ],
  },
];

/** `diagrama <tipo>(...) { }`: a group (translated by x, y) whose `nodo`s are placed by the layout engine. */
export const DIAGRAM_DEFINITION: ShapeDefinition = {
  name: "diagrama",
  category: "group",
  params: [
    { name: "x", type: "number", required: false, defaultValue: DEFAULT_DIAGRAM_ORIGIN },
    { name: "y", type: "number", required: false, defaultValue: DEFAULT_DIAGRAM_ORIGIN },
    { name: "direccion", type: "string", required: false, allowedValues: DIRECTIONS },
    { name: "espaciado", type: "number", required: false, defaultValue: DEFAULT_DIAGRAM_SPACING },
  ],
};

/**
 * `grupo(...) { ... }` is syntax (a block), not a registry command, but its
 * arguments are validated like any other command's: same table, same errors.
 * Transform order: translate(x, y) · rotate(rotacion) · scale(escala).
 */
export const GROUP_DEFINITION: ShapeDefinition = {
  name: "grupo",
  category: "group",
  params: [
    { name: "x", type: "number", required: false, defaultValue: 0 },
    { name: "y", type: "number", required: false, defaultValue: 0 },
    { name: "escala", type: "number", required: false, defaultValue: 1 },
    { name: "rotacion", type: "number", required: false, defaultValue: DEFAULT_ROTATION },
    OPACITY_PARAM,
  ],
};
