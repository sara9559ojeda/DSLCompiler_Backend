import type { ResolvedGroup, Scene } from "../semantic/Scene.js";
import type { IShapeRenderer } from "./IShapeRenderer.js";

/** Walks the Scene IR and delegates all drawing to the injected renderer (SRP + DIP). */
export class CodeGenerator {
  constructor(private readonly renderer: IShapeRenderer) {}

  generate(scene: Scene): string {
    const shapesById = new Map(scene.shapes.map((shape) => [shape.id, shape]));
    const groupsById = new Map<string, ResolvedGroup>((scene.groups ?? []).map((group) => [group.id, group]));
    const body: string[] = [];

    // Shapes are in paint order and a group's members are contiguous, so one
    // stack of open <g> elements is enough: pop what the next shape leaves,
    // push what it enters.
    let open: string[] = [];
    for (const shape of scene.shapes) {
      const target = this.chainOf(shape.groupId, groupsById);
      let common = 0;
      while (common < open.length && common < target.length && open[common] === target[common]!.id) common += 1;
      for (let index = open.length; index > common; index -= 1) body.push(this.renderer.closeGroup());
      for (const group of target.slice(common)) body.push(this.renderer.openGroup(group));
      open = target.map((group) => group.id);
      body.push(this.renderer.renderShape(shape));
    }
    for (let index = open.length; index > 0; index -= 1) body.push(this.renderer.closeGroup());

    for (const connection of scene.connections) {
      const from = shapesById.get(connection.fromId);
      const to = shapesById.get(connection.toId);
      if (!from || !to) continue;
      body.push(this.renderer.renderConnection(connection, from, to, groupsById));
    }

    return this.renderer.wrapDocument(body.join(""), scene.canvas);
  }

  /** Outermost → innermost groups containing `groupId`. */
  private chainOf(groupId: string | undefined, groups: ReadonlyMap<string, ResolvedGroup>): ResolvedGroup[] {
    const chain: ResolvedGroup[] = [];
    let current = groupId === undefined ? undefined : groups.get(groupId);
    while (current) {
      chain.unshift(current);
      current = current.parentId === undefined ? undefined : groups.get(current.parentId);
    }
    return chain;
  }
}
