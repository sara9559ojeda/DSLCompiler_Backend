import type { SourcePosition } from "@compiler-img/shared";
import type { ArgumentNode } from "./ArgumentNode.js";

export class CommandCallNode {
  public readonly kind = "commandCall" as const;

  constructor(
    public readonly name: string,
    public readonly args: readonly ArgumentNode[],
    public readonly position: SourcePosition,
  ) {}
}
