import type { ParamDefinition, ShapeDefinition } from "@compiler-img/compiler-core";

function describeParam(param: ParamDefinition): string {
  const requirement = param.required
    ? "requerido"
    : `opcional, por defecto ${JSON.stringify(param.defaultValue)}`;
  const allowed = param.allowedValues ? `, valores válidos: ${param.allowedValues.join("|")}` : "";
  return `${param.name}: ${param.type} (${requirement}${allowed})`;
}

/** One line per command, generated from the live registry — never hand-duplicated. */
export function describeShape(definition: ShapeDefinition): string {
  const params = definition.params.map(describeParam).join(", ");
  return `- ${definition.name}(${params})`;
}
