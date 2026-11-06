import type { SourcePosition } from "../../diagnostics/Diagnostic.js";
import { NO_SPAN, type Span } from "../Span.js";
import type { ValueNode } from "./ValueNode.js";

/** `name` is null for a positional argument (e.g. the `c1` in `conectar(c1, r1)`). */
export class ArgumentNode {
  public readonly kind = "argument" as const;

  constructor(
    public readonly name: string | null,
    public readonly value: ValueNode,
    public readonly position: SourcePosition,
    /** The whole argument, `name=value` included. */
    public readonly span: Span = NO_SPAN,
  ) {}
}
