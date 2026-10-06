import { Type, type Static } from "@sinclair/typebox";

export const SuggestRequestSchema = Type.Object({
  prompt: Type.String({ minLength: 1, maxLength: 500 }),
});
export type SuggestRequestBody = Static<typeof SuggestRequestSchema>;

const DiagnosticSchema = Type.Object({
  severity: Type.Union([Type.Literal("error"), Type.Literal("warning")]),
  message: Type.String(),
  position: Type.Object({ line: Type.Number(), column: Type.Number() }),
});

export const ExplainErrorRequestSchema = Type.Object({
  source: Type.String({ minLength: 1 }),
  diagnostics: Type.Array(DiagnosticSchema, { minItems: 1 }),
});
export type ExplainErrorRequestBody = Static<typeof ExplainErrorRequestSchema>;
