export type { Diagnostic, DiagnosticSeverity, SourcePosition } from "./diagnostics/Diagnostic.js";
export type { ParamDefinition, ParamType } from "./registry/ParamDefinition.js";
export type { ShapeDefinition, ShapeCategory } from "./registry/ShapeDefinition.js";
export { NAMED_COLORS, DEFAULT_SHAPE_COLOR } from "./registry/colors.config.js";
export {
  DEFAULT_FONT_SIZE,
  DEFAULT_CONNECTION_TYPE,
  DEFAULT_STROKE_WIDTH,
  CONNECTION_TYPES,
} from "./registry/dsl-defaults.config.js";
export { SHAPE_DEFINITIONS } from "./registry/shapes.config.js";
export {
  CompileRequestSchema,
  ExportRequestSchema,
  type CompileRequestBody,
  type ExportRequestBody,
} from "./contracts/CompileContract.js";
export {
  RegisterRequestSchema,
  LoginRequestSchema,
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  type RegisterRequestBody,
  type LoginRequestBody,
  type CreateProjectRequestBody,
  type UpdateProjectRequestBody,
  USER_ID_HEADER,
} from "./contracts/ProjectsContract.js";
export {
  SuggestRequestSchema,
  ExplainErrorRequestSchema,
  type SuggestRequestBody,
  type ExplainErrorRequestBody,
} from "./contracts/AiAssistContract.js";
