import type { Scene } from "../semantic/Scene.js";
import type { IShapeRenderer } from "./IShapeRenderer.js";

/** Walks the Scene IR and delegates all drawing to the injected renderer (SRP + DIP). */
export class CodeGenerator {
  constructor(private readonly renderer: IShapeRenderer) {}

  generate(scene: Scene): string {
    const shapesById = new Map(scene.shapes.map((shape) => [shape.id, shape]));
    const body: string[] = [];

    for (const shape of scene.shapes) {
      body.push(this.renderer.renderShape(shape));
    }

    for (const connection of scene.connections) {
      const from = shapesById.get(connection.fromId);
      const to = shapesById.get(connection.toId);
      if (!from || !to) continue;
      body.push(this.renderer.renderConnection(connection, from, to));
    }

    return this.renderer.wrapDocument(body.join(""), scene.canvas);
  }
}
