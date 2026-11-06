import type { SourcePosition } from "../../diagnostics/Diagnostic.js";
import { NO_SPAN, type Span } from "../Span.js";
import { CommandCallNode } from "./CommandCallNode.js";
import type { ValueNode } from "./ValueNode.js";

/**
 * `identifier = value`. When `value` is a call to a shape command this binds a
 * shape (`c1 = crear_circulo(...)`); otherwise it reassigns a `let` variable.
 */
export class AssignmentNode {
  public readonly kind = "assignment" as const;

  constructor(
    public readonly identifier: string,
    public readonly value: ValueNode,
    public readonly position: SourcePosition,
    public readonly span: Span = NO_SPAN,
  ) {}

  /** The right-hand side when it is a call (the only form before the language had expressions). */
  get call(): CommandCallNode | null {
    return this.value instanceof CommandCallNode ? this.value : null;
  }
}
