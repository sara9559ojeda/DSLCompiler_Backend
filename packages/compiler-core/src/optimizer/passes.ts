import type { ResolvedShape, Scene } from "../semantic/Scene.js";
import { DEFAULT_STROKE_WIDTH } from "../registry/dsl-defaults.config.js";
import type { IScenePass } from "./SceneOptimizer.js";

interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

const num = (value: number | string | undefined): number => Number(value);

/**
 * Bounding box of what a shape paints, or null when it can't be bounded
 * reliably (text: its width depends on the font) — unbounded shapes are
 * never removed by geometry-based passes.
 */
function paintedBox(shape: ResolvedShape): Box | null {
  const p = shape.params;
  switch (shape.kind) {
    case "crear_circulo":
      return { minX: num(p.x) - num(p.radio), minY: num(p.y) - num(p.radio), maxX: num(p.x) + num(p.radio), maxY: num(p.y) + num(p.radio) };
    case "crear_rectangulo":
      return { minX: num(p.x), minY: num(p.y), maxX: num(p.x) + num(p.ancho), maxY: num(p.y) + num(p.alto) };
    case "crear_linea": {
      const half = DEFAULT_STROKE_WIDTH / 2;
      return {
        minX: Math.min(num(p.x1), num(p.x2)) - half,
        minY: Math.min(num(p.y1), num(p.y2)) - half,
        maxX: Math.max(num(p.x1), num(p.x2)) + half,
        maxY: Math.max(num(p.y1), num(p.y2)) + half,
      };
    }
    default:
      return null;
  }
}

/** True when the shape paints nothing at all (zero/negative size, empty text). */
function isDegenerate(shape: ResolvedShape): boolean {
  const p = shape.params;
  switch (shape.kind) {
    case "crear_circulo":
      return num(p.radio) <= 0;
    case "crear_rectangulo":
      return num(p.ancho) <= 0 || num(p.alto) <= 0;
    case "crear_linea":
      // Butt line caps: a zero-length line draws no pixels.
      return num(p.x1) === num(p.x2) && num(p.y1) === num(p.y2);
    case "crear_texto":
      return String(p.contenido) === "" || num(p.tamano) <= 0;
    default:
      return false;
  }
}

/** Shapes a connection anchors to must survive even when invisible — the line is drawn from their position. */
function referencedIds(scene: Scene): Set<string> {
  return new Set(scene.connections.flatMap((connection) => [connection.fromId, connection.toId]));
}

function withoutShapes(scene: Scene, keep: (shape: ResolvedShape) => boolean): Scene {
  const referenced = referencedIds(scene);
  return { ...scene, shapes: scene.shapes.filter((shape) => referenced.has(shape.id) || keep(shape)) };
}

/** Removes shapes that lie entirely outside the canvas (the SVG viewport clips them anyway). */
export const removeOffCanvasShapes: IScenePass = {
  name: "remove-off-canvas",
  run: (scene) =>
    withoutShapes(scene, (shape) => {
      const box = paintedBox(shape);
      if (!box) return true;
      return box.maxX > 0 && box.maxY > 0 && box.minX < scene.canvas.width && box.minY < scene.canvas.height;
    }),
};

/** Removes shapes that paint nothing (radius 0, empty rectangle, zero-length line, empty text). */
export const removeDegenerateShapes: IScenePass = {
  name: "remove-degenerate",
  run: (scene) => withoutShapes(scene, (shape) => !isDegenerate(shape)),
};

/** Named colors are opaque; only #rgba / #rrggbbaa hex colors can carry transparency. */
const isOpaque = (color: number | string | undefined): boolean => {
  const value = String(color);
  return !(value.startsWith("#") && (value.length === 5 || value.length === 9));
};

/**
 * Removes shapes completely hidden under an opaque rectangle drawn later
 * (occlusion culling). The covered shape's box — including its
 * anti-aliased edge — must sit inside the rectangle with a 1px margin, so
 * the rectangle's own soft edge can't let any of it show through.
 *
 * (Removing *duplicates* is deliberately not a pass: drawing the same
 * anti-aliased shape twice darkens its edge pixels, so dropping a copy is
 * visible — not equivalent.)
 */
export const removeOccludedShapes: IScenePass = {
  name: "remove-occluded",
  run: (scene) => {
    const covers = (cover: Box, inner: Box): boolean =>
      inner.minX >= cover.minX + 1 && inner.minY >= cover.minY + 1 && inner.maxX <= cover.maxX - 1 && inner.maxY <= cover.maxY - 1;

    const hidden = new Set<ResolvedShape>();
    scene.shapes.forEach((shape, index) => {
      const box = paintedBox(shape);
      if (!box) return;
      const occluded = scene.shapes.slice(index + 1).some((later) => {
        if (later.kind !== "crear_rectangulo" || !isOpaque(later.params.color)) return false;
        const laterBox = paintedBox(later);
        return laterBox !== null && covers(laterBox, box);
      });
      if (occluded) hidden.add(shape);
    });
    return withoutShapes(scene, (shape) => !hidden.has(shape));
  },
};

export const DEFAULT_SCENE_PASSES: readonly IScenePass[] = [
  removeDegenerateShapes,
  removeOffCanvasShapes,
  removeOccludedShapes,
];
