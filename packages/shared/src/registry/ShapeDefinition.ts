import type { ParamDefinition } from "./ParamDefinition.js";

export type ShapeCategory = "shape" | "connection";

export interface ShapeDefinition {
  readonly name: string;
  readonly category: ShapeCategory;
  readonly params: readonly ParamDefinition[];
}
