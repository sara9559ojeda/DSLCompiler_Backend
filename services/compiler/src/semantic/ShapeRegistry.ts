import type { ShapeDefinition } from "@compiler-img/shared";

/**
 * Narrow, read-only lookup contract — the SemanticAnalyzer depends on this
 * interface, not on a concrete map (Dependency Inversion), so the catalog of
 * commands can be swapped or extended without touching analysis logic.
 */
export interface IShapeRegistry {
  get(name: string): ShapeDefinition | undefined;
  has(name: string): boolean;
  all(): readonly ShapeDefinition[];
}

export class DefaultShapeRegistry implements IShapeRegistry {
  private readonly definitionsByName: ReadonlyMap<string, ShapeDefinition>;

  constructor(definitions: readonly ShapeDefinition[]) {
    this.definitionsByName = new Map(definitions.map((definition) => [definition.name, definition]));
  }

  get(name: string): ShapeDefinition | undefined {
    return this.definitionsByName.get(name);
  }

  has(name: string): boolean {
    return this.definitionsByName.has(name);
  }

  all(): readonly ShapeDefinition[] {
    return [...this.definitionsByName.values()];
  }
}
