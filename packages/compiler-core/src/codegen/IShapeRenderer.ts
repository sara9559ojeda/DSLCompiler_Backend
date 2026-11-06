import type { CanvasConfig, ResolvedConnection, ResolvedGroup, ResolvedShape } from "../semantic/Scene.js";

/**
 * Abstraction the CodeGenerator depends on (Dependency Inversion) instead of
 * a concrete SVG/PNG implementation. A future CanvasShapeRenderer or
 * different vector backend is a drop-in substitute (Liskov): the
 * CodeGenerator never changes.
 */
export interface IShapeRenderer {
  renderShape(shape: ResolvedShape): string;
  /** `groups` lets the renderer place an anchor in canvas space even when the shape sits inside transformed groups. */
  renderConnection(
    connection: ResolvedConnection,
    from: ResolvedShape,
    to: ResolvedShape,
    groups?: ReadonlyMap<string, ResolvedGroup>,
  ): string;
  openGroup(group: ResolvedGroup): string;
  closeGroup(): string;
  wrapDocument(body: string, canvas: CanvasConfig): string;
}
