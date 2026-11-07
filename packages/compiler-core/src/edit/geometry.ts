import type { ResolvedShape } from "../semantic/Scene.js";

/**
 * Geometry of the visual editor: which parameters a drag changes. Pure
 * functions over a shape's params in ITS OWN coordinate space (a shape inside a
 * group is described in the group's local space; callers convert pointer
 * positions with `toLocalSpace` / `vectorToLocal` from semantic/groupTransform).
 */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "p1" | "p2";

export interface Handle {
  readonly id: HandleId;
  readonly x: number;
  readonly y: number;
}

const n = (value: number | string | undefined): number => Number(value ?? 0);

/** Text has no exact width without a font; this estimate is only for fitting the view and hit areas. */
const APPROX_CHAR_WIDTH = 0.56;

/** Bounding box of what a shape paints, in its own coordinate space. Rotation is ignored (the unrotated box). */
export function shapeBox(shape: ResolvedShape): Box | null {
  const p = shape.params;
  switch (shape.kind) {
    case "crear_circulo":
      return { x: n(p.x) - n(p.radio), y: n(p.y) - n(p.radio), width: n(p.radio) * 2, height: n(p.radio) * 2 };
    case "crear_rectangulo":
    case "nodo":
      return { x: n(p.x), y: n(p.y), width: n(p.ancho), height: n(p.alto) };
    case "crear_linea": {
      const x = Math.min(n(p.x1), n(p.x2));
      const y = Math.min(n(p.y1), n(p.y2));
      return { x, y, width: Math.abs(n(p.x1) - n(p.x2)), height: Math.abs(n(p.y1) - n(p.y2)) };
    }
    case "crear_texto": {
      const size = n(p.tamano);
      return { x: n(p.x), y: n(p.y) - size, width: String(p.contenido).length * size * APPROX_CHAR_WIDTH, height: size * 1.2 };
    }
    default:
      return null;
  }
}

/** The params to change so the whole shape moves by (dx, dy), in its own coordinate space. */
export function moveParams(shape: ResolvedShape, dx: number, dy: number): Record<string, number> {
  const p = shape.params;
  switch (shape.kind) {
    case "crear_linea":
      return { x1: n(p.x1) + dx, y1: n(p.y1) + dy, x2: n(p.x2) + dx, y2: n(p.y2) + dy };
    case "crear_circulo":
    case "crear_rectangulo":
    case "crear_texto":
    case "nodo":
      return { x: n(p.x) + dx, y: n(p.y) + dy };
    default:
      return {};
  }
}

/** Resize handles to draw, in the shape's own space. Rotated rectangles can only be moved (their box isn't axis-aligned). */
export function handlesFor(shape: ResolvedShape): Handle[] {
  const p = shape.params;
  switch (shape.kind) {
    case "crear_circulo": {
      const x = n(p.x);
      const y = n(p.y);
      const r = n(p.radio);
      return [
        { id: "n", x, y: y - r },
        { id: "e", x: x + r, y },
        { id: "s", x, y: y + r },
        { id: "w", x: x - r, y },
      ];
    }
    case "crear_rectangulo": {
      if (n(p.rotacion) !== 0) return [];
      const left = n(p.x);
      const top = n(p.y);
      const right = left + n(p.ancho);
      const bottom = top + n(p.alto);
      const midX = (left + right) / 2;
      const midY = (top + bottom) / 2;
      return [
        { id: "nw", x: left, y: top },
        { id: "n", x: midX, y: top },
        { id: "ne", x: right, y: top },
        { id: "e", x: right, y: midY },
        { id: "se", x: right, y: bottom },
        { id: "s", x: midX, y: bottom },
        { id: "sw", x: left, y: bottom },
        { id: "w", x: left, y: midY },
      ];
    }
    case "crear_linea":
      return [
        { id: "p1", x: n(p.x1), y: n(p.y1) },
        { id: "p2", x: n(p.x2), y: n(p.y2) },
      ];
    default:
      return [];
  }
}

const MIN_SIZE = 1;

/** The params after dragging `handle` to `point` (both in the shape's own space). */
export function resizeParams(shape: ResolvedShape, handle: HandleId, point: { x: number; y: number }): Record<string, number> {
  const p = shape.params;
  switch (shape.kind) {
    case "crear_circulo": {
      const radius = Math.hypot(point.x - n(p.x), point.y - n(p.y));
      return { radio: Math.max(MIN_SIZE, radius) };
    }
    case "crear_rectangulo": {
      let left = n(p.x);
      let top = n(p.y);
      let right = left + n(p.ancho);
      let bottom = top + n(p.alto);
      if (handle.includes("w")) left = point.x;
      if (handle.includes("e")) right = point.x;
      if (handle.includes("n")) top = point.y;
      if (handle.includes("s")) bottom = point.y;
      // Dragging past the opposite edge flips the rectangle instead of producing a negative size.
      const x = Math.min(left, right);
      const y = Math.min(top, bottom);
      return {
        x,
        y,
        ancho: Math.max(MIN_SIZE, Math.abs(right - left)),
        alto: Math.max(MIN_SIZE, Math.abs(bottom - top)),
      };
    }
    case "crear_linea":
      return handle === "p1" ? { x1: point.x, y1: point.y } : handle === "p2" ? { x2: point.x, y2: point.y } : {};
    default:
      return {};
  }
}
