import { CommandCallNode } from "./nodes/CommandCallNode.js";
import type { StatementNode } from "./nodes/StatementNode.js";
import type { ExpressionNode, ValueNode } from "./nodes/ValueNode.js";

/** Visits an expression and every sub-expression, depth first. */
export function walkExpression(root: ValueNode, visit: (node: ValueNode) => void): void {
  visit(root);
  const node = root as ExpressionNode;
  switch (node.kind) {
    case "binary":
      walkExpression(node.left, visit);
      walkExpression(node.right, visit);
      return;
    case "unary":
      walkExpression(node.operand, visit);
      return;
    case "commandCall":
      for (const arg of node.args) walkExpression(arg.value, visit);
      return;
    default:
      return;
  }
}

/** Visits every statement (nested blocks included) in source order. */
export function walkStatements(
  statements: readonly StatementNode[],
  visitStatement: (statement: StatementNode) => void,
  visitExpression?: (node: ValueNode) => void,
): void {
  const expr = (node: ValueNode | null): void => {
    if (node && visitExpression) walkExpression(node, visitExpression);
  };
  for (const statement of statements) {
    visitStatement(statement);
    if (statement instanceof CommandCallNode) {
      expr(statement);
      continue;
    }
    switch (statement.kind) {
      case "assignment":
        expr(statement.value);
        break;
      case "variableDecl":
        expr(statement.init);
        break;
      case "functionDecl":
        walkStatements(statement.body.statements, visitStatement, visitExpression);
        break;
      case "for":
        if (statement.init) walkStatements([statement.init], visitStatement, visitExpression);
        expr(statement.condition);
        if (statement.update) walkStatements([statement.update], visitStatement, visitExpression);
        walkStatements(statement.body.statements, visitStatement, visitExpression);
        break;
      case "if":
        expr(statement.condition);
        walkStatements(statement.thenBlock.statements, visitStatement, visitExpression);
        if (statement.elseBranch) walkStatements([statement.elseBranch], visitStatement, visitExpression);
        break;
      case "group":
        for (const arg of statement.args) expr(arg.value);
        walkStatements(statement.body.statements, visitStatement, visitExpression);
        break;
      case "block":
        walkStatements(statement.statements, visitStatement, visitExpression);
        break;
      case "return":
        expr(statement.value);
        break;
    }
  }
}
