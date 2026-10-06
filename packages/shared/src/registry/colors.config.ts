/**
 * Named colors accepted by the DSL wherever a `color` parameter is expected.
 * Adding a color here is the only change needed — no code that consumes
 * colors ever hardcodes a name-to-hex mapping.
 */
export const NAMED_COLORS: Readonly<Record<string, string>> = Object.freeze({
  rojo: "#e53935",
  azul: "#1e88e5",
  verde: "#43a047",
  amarillo: "#fdd835",
  naranja: "#fb8c00",
  morado: "#8e24aa",
  negro: "#000000",
  blanco: "#ffffff",
  gris: "#757575",
});

export const DEFAULT_SHAPE_COLOR = NAMED_COLORS["negro"];
