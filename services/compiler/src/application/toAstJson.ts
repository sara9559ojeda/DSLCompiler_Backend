import type { ProgramNode } from "@saramariaojeda9559/compiler-core";

/** Every AST node carries a literal `kind` (compiler-core >= 0.2.0), so plain JSON keeps the node types. */
export function toAstJson(program: ProgramNode): string {
  return JSON.stringify(program);
}
