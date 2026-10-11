import type { SourcePosition } from "../../diagnostics/Diagnostic.js";
import type { ValueNode } from "./ValueNode.js";

/** `name` is null for a positional argument (e.g. the `c1` in `conectar(c1, r1)`). */
export class ArgumentNode {
  constructor(
    public readonly name: string | null,
    public readonly value: ValueNode,
    public readonly position: SourcePosition,
  ) {}
}
