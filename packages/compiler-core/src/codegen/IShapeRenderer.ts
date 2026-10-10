import type { CanvasConfig, ResolvedConnection, ResolvedShape } from "../semantic/Scene.js";

/**
 * Abstraction the CodeGenerator depends on (Dependency Inversion) instead of
 * a concrete SVG/PNG implementation. A future CanvasShapeRenderer or
 * different vector backend is a drop-in substitute (Liskov) — the
 * CodeGenerator never changes.
 */
export interface IShapeRenderer {
  renderShape(shape: ResolvedShape): string;
  renderConnection(connection: ResolvedConnection, from: ResolvedShape, to: ResolvedShape): string;
  wrapDocument(body: string, canvas: CanvasConfig): string;
}
