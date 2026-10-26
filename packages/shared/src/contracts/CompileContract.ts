import { Type, type Static } from "@sinclair/typebox";

/**
 * Wire contract shared by the API Gateway (validates the public request
 * before proxying) and the compiler service (validates it again as an
 * internal boundary). Single source of truth avoids the two drifting apart.
 */
/** Generous for any hand-written diagram (~5000 statements), small enough to bound compile cost. */
export const MAX_SOURCE_LENGTH = 200_000;

export const CompileRequestSchema = Type.Object({
  source: Type.String({ minLength: 1, maxLength: MAX_SOURCE_LENGTH }),
});
export type CompileRequestBody = Static<typeof CompileRequestSchema>;

export const ExportRequestSchema = Type.Object({
  source: Type.String({ minLength: 1, maxLength: MAX_SOURCE_LENGTH }),
  format: Type.Union([Type.Literal("svg"), Type.Literal("png")]),
});
export type ExportRequestBody = Static<typeof ExportRequestSchema>;
