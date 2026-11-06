import type { ResolvedGroup } from "./Scene.js";

export interface Point {
  readonly x: number;
  readonly y: number;
}

const DEG_TO_RAD = Math.PI / 180;

/** Outermost → innermost groups that contain `groupId` (empty when it is at the top level). */
export function groupChain(groupId: string | undefined, groups: ReadonlyMap<string, ResolvedGroup>): ResolvedGroup[] {
  const chain: ResolvedGroup[] = [];
  let current = groupId === undefined ? undefined : groups.get(groupId);
  while (current) {
    chain.unshift(current);
    current = current.parentId === undefined ? undefined : groups.get(current.parentId);
  }
  return chain;
}

/**
 * A point in a group's local space → canvas space. Applies each enclosing
 * group's transform, innermost first: scale, then rotate, then translate
 * (the same `translate · rotate · scale` the renderer emits for the <g>).
 */
export function toCanvasSpace(point: Point, groupId: string | undefined, groups: ReadonlyMap<string, ResolvedGroup>): Point {
  let result = point;
  for (const group of [...groupChain(groupId, groups)].reverse()) {
    const { x = 0, y = 0, escala = 1, rotacion = 0 } = group.params;
    const scaledX = result.x * escala;
    const scaledY = result.y * escala;
    const cos = Math.cos(rotacion * DEG_TO_RAD);
    const sin = Math.sin(rotacion * DEG_TO_RAD);
    result = { x: scaledX * cos - scaledY * sin + x, y: scaledX * sin + scaledY * cos + y };
  }
  return result;
}

/** The inverse of {@link toCanvasSpace}: a canvas point → the local space of `groupId`. */
export function toLocalSpace(point: Point, groupId: string | undefined, groups: ReadonlyMap<string, ResolvedGroup>): Point {
  let result = point;
  for (const group of groupChain(groupId, groups)) {
    const { x = 0, y = 0, escala = 1, rotacion = 0 } = group.params;
    const dx = result.x - x;
    const dy = result.y - y;
    const cos = Math.cos(-rotacion * DEG_TO_RAD);
    const sin = Math.sin(-rotacion * DEG_TO_RAD);
    const unscale = escala === 0 ? 1 : 1 / escala;
    result = { x: (dx * cos - dy * sin) * unscale, y: (dx * sin + dy * cos) * unscale };
  }
  return result;
}

/** A canvas-space displacement (a drag) → the equivalent displacement inside `groupId`'s local space. */
export function vectorToLocal(vector: Point, groupId: string | undefined, groups: ReadonlyMap<string, ResolvedGroup>): Point {
  const origin = toLocalSpace({ x: 0, y: 0 }, groupId, groups);
  const target = toLocalSpace(vector, groupId, groups);
  return { x: target.x - origin.x, y: target.y - origin.y };
}
