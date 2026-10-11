import { SHAPE_DEFINITIONS, NAMED_COLORS } from "@saramariaojeda9559/compiler-core";
import { describeShape } from "./describeShape.js";

/**
 * The grammar context shared by every prompt in this service — generated
 * from the same registry the compiler validates against
 * (packages/shared/src/registry/shapes.config.ts), so it can never drift
 * out of sync with what the language actually accepts.
 */
export function buildGrammarContext(): string {
  const commands = SHAPE_DEFINITIONS.map(describeShape).join("\n");
  const colorNames = Object.keys(NAMED_COLORS).join(", ");

  return [
    'Sintaxis general: "[identificador =] comando(arg, arg, ..., nombre=valor, ...);"',
    "Cada instrucción termina en ';'. Los argumentos posicionales van antes que los nombrados.",
    "Un valor es un número, una cadena entre comillas, un color (#rrggbb o un nombre) o un identificador (referencia a una figura ya asignada).",
    "",
    "Comandos disponibles:",
    commands,
    "",
    `Colores nombrados válidos: ${colorNames} (o cualquier hex #rrggbb).`,
    "Solo las figuras (category: shape) pueden asignarse a un identificador; 'conectar' siempre se usa como instrucción suelta, referenciando identificadores ya declarados.",
  ].join("\n");
}
