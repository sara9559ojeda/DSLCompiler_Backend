import type { StatementNode } from "./StatementNode.js";

export class ProgramNode {
  constructor(public readonly statements: readonly StatementNode[]) {}
}
