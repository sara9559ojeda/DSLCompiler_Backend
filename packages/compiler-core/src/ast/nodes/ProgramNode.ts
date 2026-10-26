import type { StatementNode } from "./StatementNode.js";

/**
 * Every AST node carries a literal `kind`, so a node serialized with
 * JSON.stringify still says what it is (class names don't survive
 * minification in browser bundles).
 */
export class ProgramNode {
  public readonly kind = "program" as const;

  constructor(public readonly statements: readonly StatementNode[]) {}
}
