/**
 * The semantic type a command parameter resolves to. The parser stays
 * agnostic of these — it only ever produces number/string/hexColor/identifier
 * literals. The registry (ShapeDefinition) is what decides what an
 * identifier value *means* for a given parameter (a color name vs a
 * reference to a previously declared shape).
 */
export type ParamType = "number" | "color" | "string" | "shapeRef";

export interface ParamDefinition {
  readonly name: string;
  readonly type: ParamType;
  readonly required: boolean;
  readonly defaultValue?: number | string;
  /** Restricts a string/color param to a fixed set of accepted values. */
  readonly allowedValues?: readonly (string | number)[];
}
