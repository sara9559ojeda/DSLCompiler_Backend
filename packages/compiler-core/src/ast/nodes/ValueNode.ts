import type { SourcePosition } from "../../diagnostics/Diagnostic.js";
import { NO_SPAN, type Span } from "../Span.js";
import type { CommandCallNode } from "./CommandCallNode.js";

/**
 * Visitor over the expression-node hierarchy. Expressions are the one place
 * in the AST where a node can be one of many concrete shapes, so it is the one
 * place the Visitor pattern earns its keep: the SemanticAnalyzer implements
 * this to evaluate each kind differently (see SemanticAnalyzer.ts).
 */
export interface IValueVisitor<T> {
  visitNumberLiteral(node: NumberLiteralNode): T;
  visitStringLiteral(node: StringLiteralNode): T;
  visitHexColorLiteral(node: HexColorLiteralNode): T;
  visitIdentifierValue(node: IdentifierValueNode): T;
  visitBinary(node: BinaryExprNode): T;
  visitUnary(node: UnaryExprNode): T;
  visitCall(node: CommandCallNode): T;
}

export abstract class ValueNode {
  protected constructor(
    public readonly position: SourcePosition,
    /** Where this expression sits in the source: what a visual edit rewrites. */
    public readonly span: Span = NO_SPAN,
  ) {}
  abstract accept<T>(visitor: IValueVisitor<T>): T;
}

export class NumberLiteralNode extends ValueNode {
  public readonly kind = "number" as const;

  constructor(
    public readonly value: number,
    position: SourcePosition,
    span?: Span,
  ) {
    super(position, span);
  }

  accept<T>(visitor: IValueVisitor<T>): T {
    return visitor.visitNumberLiteral(this);
  }
}

export class StringLiteralNode extends ValueNode {
  public readonly kind = "string" as const;

  constructor(
    public readonly value: string,
    position: SourcePosition,
    span?: Span,
  ) {
    super(position, span);
  }

  accept<T>(visitor: IValueVisitor<T>): T {
    return visitor.visitStringLiteral(this);
  }
}

export class HexColorLiteralNode extends ValueNode {
  public readonly kind = "hexColor" as const;

  constructor(
    public readonly value: string,
    position: SourcePosition,
    span?: Span,
  ) {
    super(position, span);
  }

  accept<T>(visitor: IValueVisitor<T>): T {
    return visitor.visitHexColorLiteral(this);
  }
}

export class IdentifierValueNode extends ValueNode {
  public readonly kind = "identifier" as const;

  constructor(
    public readonly name: string,
    position: SourcePosition,
    span?: Span,
  ) {
    super(position, span);
  }

  accept<T>(visitor: IValueVisitor<T>): T {
    return visitor.visitIdentifierValue(this);
  }
}

export type BinaryOperator = "+" | "-" | "*" | "/" | "%" | "<" | "<=" | ">" | ">=" | "==" | "!=" | "&&" | "||";

export class BinaryExprNode extends ValueNode {
  public readonly kind = "binary" as const;

  constructor(
    public readonly operator: BinaryOperator,
    public readonly left: ValueNode,
    public readonly right: ValueNode,
    /** Position of the operator token (where "cannot add text and number" should point). */
    position: SourcePosition,
    span?: Span,
  ) {
    super(position, span);
  }

  accept<T>(visitor: IValueVisitor<T>): T {
    return visitor.visitBinary(this);
  }
}

export type UnaryOperator = "-" | "!";

export class UnaryExprNode extends ValueNode {
  public readonly kind = "unary" as const;

  constructor(
    public readonly operator: UnaryOperator,
    public readonly operand: ValueNode,
    position: SourcePosition,
    span?: Span,
  ) {
    super(position, span);
  }

  accept<T>(visitor: IValueVisitor<T>): T {
    return visitor.visitUnary(this);
  }
}

/** Every concrete expression node: lets code `switch` on `kind` and get full narrowing. */
export type ExpressionNode =
  | NumberLiteralNode
  | StringLiteralNode
  | HexColorLiteralNode
  | IdentifierValueNode
  | BinaryExprNode
  | UnaryExprNode
  | CommandCallNode;
