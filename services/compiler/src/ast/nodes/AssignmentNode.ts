import type { SourcePosition } from "@compiler-img/shared";
import type { CommandCallNode } from "./CommandCallNode.js";

export class AssignmentNode {
  public readonly kind = "assignment" as const;

  constructor(
    public readonly identifier: string,
    public readonly call: CommandCallNode,
    public readonly position: SourcePosition,
  ) {}
}
