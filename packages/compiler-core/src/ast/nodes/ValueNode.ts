import type { SourcePosition } from "../../diagnostics/Diagnostic.js";

/**
 * Visitor over the value-node hierarchy. This is the one place in the AST
 * where a node can be one of several concrete shapes, so it's the one place
 * the Visitor pattern earns its keep — the SemanticAnalyzer implements this
 * to resolve each literal kind differently (see SemanticAnalyzer.ts).
 */
export interface IValueVisitor<T> {
  visitNumberLiteral(node: NumberLiteralNode): T;
  visitStringLiteral(node: StringLiteralNode): T;
  visitHexColorLiteral(node: HexColorLiteralNode): T;
  visitIdentifierValue(node: IdentifierValueNode): T;
}

export abstract class ValueNode {
  protected constructor(public readonly position: SourcePosition) {}
  abstract accept<T>(visitor: IValueVisitor<T>): T;
}

export class NumberLiteralNode extends ValueNode {
  public readonly kind = "number" as const;

  constructor(
    public readonly value: number,
    position: SourcePosition,
  ) {
    super(position);
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
  ) {
    super(position);
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
  ) {
    super(position);
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
  ) {
    super(position);
  }

  accept<T>(visitor: IValueVisitor<T>): T {
    return visitor.visitIdentifierValue(this);
  }
}
