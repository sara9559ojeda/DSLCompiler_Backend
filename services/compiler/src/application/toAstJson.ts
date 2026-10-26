import type { ProgramNode } from "@saramariaojeda9559/compiler-core";

/**
 * AST nodes are class instances; plain JSON.stringify would drop which node
 * type each object is. This tags every non-plain object with its class name
 * (`"node": "CommandCallNode"`) so the serialized tree stays readable.
 */
export function toAstJson(program: ProgramNode): string {
  return JSON.stringify(program, (_key, value: unknown) => {
    if (value !== null && typeof value === "object" && !Array.isArray(value) && value.constructor !== Object) {
      return { node: value.constructor.name, ...value };
    }
    return value;
  });
}
