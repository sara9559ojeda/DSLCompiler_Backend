import type { Scene } from "../semantic/Scene.js";

/**
 * One rewrite of the Scene IR. Every pass must be *visually equivalent*:
 * the optimized scene renders to the same image as the input — it only
 * drops work that can't be seen.
 */
export interface IScenePass {
  readonly name: string;
  run(scene: Scene): Scene;
}

export interface PassReport {
  readonly pass: string;
  readonly removedShapes: number;
  readonly removedConnections: number;
}

export interface OptimizationResult {
  readonly scene: Scene;
  readonly report: readonly PassReport[];
}

/** Runs the configured passes in order and records what each one removed. */
export class SceneOptimizer {
  constructor(private readonly passes: readonly IScenePass[]) {}

  optimize(scene: Scene): OptimizationResult {
    const report: PassReport[] = [];
    let current = scene;
    for (const pass of this.passes) {
      const next = pass.run(current);
      report.push({
        pass: pass.name,
        removedShapes: current.shapes.length - next.shapes.length,
        removedConnections: current.connections.length - next.connections.length,
      });
      current = next;
    }
    return { scene: current, report };
  }
}
