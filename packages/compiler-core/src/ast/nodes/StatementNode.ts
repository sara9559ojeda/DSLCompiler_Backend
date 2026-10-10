import type { AssignmentNode } from "./AssignmentNode.js";
import type { CommandCallNode } from "./CommandCallNode.js";

export type StatementNode = AssignmentNode | CommandCallNode;
