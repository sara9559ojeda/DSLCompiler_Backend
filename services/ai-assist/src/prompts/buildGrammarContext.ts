import { SHAPE_DEFINITIONS, NAMED_COLORS } from "@saramariaojeda9559/compiler-core";
import { describeShape } from "./describeShape.js";

const LANGUAGE_V2 = [
  "Lenguaje 2.0 (además de los comandos):",
  "- Variables: 'const x = 10;' (no reasignable) y 'let y = 0;' (se reasigna con 'y = y + 1;'). Los ámbitos son por bloque { }.",
  "- Expresiones con + - * / % y paréntesis, comparaciones < <= > >= == != y lógicos && || !. No hay booleanos: 1 es verdadero y 0 falso. '+' también concatena texto.",
  "- Funciones matemáticas: sin cos tan (en grados), sqrt abs min max floor ceil round.",
  "- Bucle: 'para (let i = 0; i < 12; i = i + 1) { ... }'. Condicional: 'si (cond) { ... } sino { ... }'.",
  "- Funciones propias (solo al nivel superior): 'funcion nombre(a, b) { ... retornar a + b; }'. Se llaman con 'nombre(1, 2)' o con argumentos nombrados.",
  "- Grupos: 'grupo(x=0, y=0, escala=1, rotacion=0, opacidad=1) { ... }' aplican una transformación a todo lo de su bloque (se pueden anidar; dentro, las coordenadas son locales).",
  "- Todas las figuras aceptan 'opacidad' (0 a 1); rectángulo y texto aceptan 'rotacion' en grados.",
  "- Límites: máximo 10000 iteraciones por bucle, profundidad de llamadas 64 y 5000 elementos.",
  '- Diagramas con layout automático: \'diagrama flujo { a = nodo("Inicio", tipo=inicio); b = nodo("Fin"); conectar(a, b, etiqueta="ok"); }\'. Tipos de diagrama: flujo, arquitectura, organigrama, proceso, red. Opciones: direccion="horizontal"|"vertical", espaciado. \'nodo\' solo vale dentro de \'diagrama\'; sin x/y el motor coloca el nodo; los nodos se pueden generar con bucles. Los nombres de variable de los nodos no deben coincidir con palabras como inicio, caja, decision, circulo o redondeado.',
  "- Los comentarios empiezan con // y llegan hasta el fin de la línea.",
].join("\n");

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
    "Solo las figuras (category: shape o node) pueden asignarse a un identificador; 'conectar' siempre se usa como instrucción suelta, referenciando identificadores ya declarados.",
    "",
    LANGUAGE_V2,
  ].join("\n");
}
