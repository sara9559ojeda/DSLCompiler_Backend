import { Type, type Static } from "@sinclair/typebox";

/**
 * Wire contract shared by the API Gateway (validates the public request
 * before proxying) and the compiler service (validates it again as an
 * internal boundary). Single source of truth avoids the two drifting apart.
 */
export const CompileRequestSchema = Type.Object({
  source: Type.String({ minLength: 1 }),
});
export type CompileRequestBody = Static<typeof CompileRequestSchema>;

export const ExportRequestSchema = Type.Object({
  source: Type.String({ minLength: 1 }),
  format: Type.Union([Type.Literal("svg"), Type.Literal("png")]),
});
export type ExportRequestBody = Static<typeof ExportRequestSchema>;
