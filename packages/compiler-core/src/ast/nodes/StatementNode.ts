import type { SourcePosition } from "../../diagnostics/Diagnostic.js";
import { NO_SPAN, type Span } from "../Span.js";
import type { AssignmentNode } from "./AssignmentNode.js";
import type { CommandCallNode } from "./CommandCallNode.js";
import type { ArgumentNode } from "./ArgumentNode.js";
import type { ValueNode } from "./ValueNode.js";

/** `const name = init;` / `let name = init;` */
export class VariableDeclNode {
  public readonly kind = "variableDecl" as const;

  constructor(
    public readonly name: string,
    public readonly mutable: boolean,
    public readonly init: ValueNode,
    public readonly position: SourcePosition,
    public readonly span: Span = NO_SPAN,
  ) {}
}

export class BlockNode {
  public readonly kind = "block" as const;

  constructor(
    public readonly statements: readonly StatementNode[],
    public readonly position: SourcePosition,
    public readonly span: Span = NO_SPAN,
  ) {}
}

export interface FunctionParam {
  readonly name: string;
  readonly position: SourcePosition;
}

export class FunctionDeclNode {
  public readonly kind = "functionDecl" as const;

  constructor(
    public readonly name: string,
    public readonly params: readonly FunctionParam[],
    public readonly body: BlockNode,
    public readonly position: SourcePosition,
    public readonly span: Span = NO_SPAN,
  ) {}
}

/** `para (let i = 0; i < n; i = i + 1) { ... }` */
export class ForNode {
  public readonly kind = "for" as const;

  constructor(
    public readonly init: VariableDeclNode | AssignmentNode | null,
    public readonly condition: ValueNode | null,
    public readonly update: AssignmentNode | null,
    public readonly body: BlockNode,
    public readonly position: SourcePosition,
    public readonly span: Span = NO_SPAN,
  ) {}
}

export class IfNode {
  public readonly kind = "if" as const;

  constructor(
    public readonly condition: ValueNode,
    public readonly thenBlock: BlockNode,
    public readonly elseBranch: BlockNode | IfNode | null,
    public readonly position: SourcePosition,
    public readonly span: Span = NO_SPAN,
  ) {}
}

/** `grupo(x=.., y=.., escala=.., rotacion=.., opacidad=..) { ... }` */
export class GroupNode {
  public readonly kind = "group" as const;

  constructor(
    public readonly args: readonly ArgumentNode[],
    public readonly body: BlockNode,
    public readonly position: SourcePosition,
    public readonly span: Span = NO_SPAN,
  ) {}
}

export class ReturnNode {
  public readonly kind = "return" as const;

  constructor(
    public readonly value: ValueNode | null,
    public readonly position: SourcePosition,
    public readonly span: Span = NO_SPAN,
  ) {}
}

export type StatementNode =
  | AssignmentNode
  | CommandCallNode
  | VariableDeclNode
  | FunctionDeclNode
  | ForNode
  | IfNode
  | GroupNode
  | BlockNode
  | ReturnNode;
