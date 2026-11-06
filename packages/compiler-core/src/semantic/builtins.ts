/**
 * Math builtins available in expressions. Angles are in DEGREES (so
 * `cos(i * 30)` walks a circle in steps of 30°, no radians conversion needed).
 * Pure functions over numbers: the analyzer owns arity checking and the
 * "result must be finite" check, so these stay trivial.
 */
export interface BuiltinFunction {
  readonly name: string;
  readonly minArgs: number;
  /** `Infinity` = variadic. */
  readonly maxArgs: number;
  readonly description: string;
  readonly run: (args: readonly number[]) => number;
}

const DEG_TO_RAD = Math.PI / 180;

export const BUILTIN_FUNCTIONS: readonly BuiltinFunction[] = [
  { name: "sin", minArgs: 1, maxArgs: 1, description: "Seno (ángulo en grados)", run: ([a]) => Math.sin(a! * DEG_TO_RAD) },
  { name: "cos", minArgs: 1, maxArgs: 1, description: "Coseno (ángulo en grados)", run: ([a]) => Math.cos(a! * DEG_TO_RAD) },
  { name: "tan", minArgs: 1, maxArgs: 1, description: "Tangente (ángulo en grados)", run: ([a]) => Math.tan(a! * DEG_TO_RAD) },
  { name: "sqrt", minArgs: 1, maxArgs: 1, description: "Raíz cuadrada", run: ([a]) => Math.sqrt(a!) },
  { name: "abs", minArgs: 1, maxArgs: 1, description: "Valor absoluto", run: ([a]) => Math.abs(a!) },
  { name: "min", minArgs: 2, maxArgs: Infinity, description: "El menor de los valores", run: (args) => Math.min(...args) },
  { name: "max", minArgs: 2, maxArgs: Infinity, description: "El mayor de los valores", run: (args) => Math.max(...args) },
  { name: "floor", minArgs: 1, maxArgs: 1, description: "Redondea hacia abajo", run: ([a]) => Math.floor(a!) },
  { name: "ceil", minArgs: 1, maxArgs: 1, description: "Redondea hacia arriba", run: ([a]) => Math.ceil(a!) },
  { name: "round", minArgs: 1, maxArgs: 1, description: "Redondea al entero más cercano", run: ([a]) => Math.round(a!) },
];

export const BUILTINS_BY_NAME: ReadonlyMap<string, BuiltinFunction> = new Map(
  BUILTIN_FUNCTIONS.map((fn) => [fn.name, fn]),
);

/** Trims floating-point noise (`cos(90)` = 6e-17, `0.1 + 0.2`) so the SVG shows clean numbers. */
export function cleanNumber(value: number): number {
  if (!Number.isFinite(value)) return value;
  const rounded = Math.round(value * 1e9) / 1e9;
  return Object.is(rounded, -0) ? 0 : rounded;
}
