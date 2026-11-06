import type { SourcePosition } from "../../diagnostics/Diagnostic.js";
import type { Span } from "../Span.js";
import type { ArgumentNode } from "./ArgumentNode.js";
import { ValueNode, type IValueVisitor } from "./ValueNode.js";

/**
 * A call `name(args)`: a shape command (`crear_circulo`), a math builtin
 * (`sin`) or a user function. Which one is a semantic question; the parser
 * only knows it is a call. It is a ValueNode so it can nest inside expressions.
 */
export class CommandCallNode extends ValueNode {
  public readonly kind = "commandCall" as const;

  constructor(
    public readonly name: string,
    public readonly args: readonly ArgumentNode[],
    position: SourcePosition,
    span?: Span,
  ) {
    super(position, span);
  }

  accept<T>(visitor: IValueVisitor<T>): T {
    return visitor.visitCall(this);
  }
}
