import { Type, type Static } from "@sinclair/typebox";

export const SuggestRequestSchema = Type.Object({
  prompt: Type.String({ minLength: 1, maxLength: 500 }),
});
export type SuggestRequestBody = Static<typeof SuggestRequestSchema>;

const DiagnosticSchema = Type.Object({
  severity: Type.Union([Type.Literal("error"), Type.Literal("warning")]),
  message: Type.String(),
  position: Type.Object({ line: Type.Number(), column: Type.Number() }),
  // Sent by newer clients (compiler-core >= 0.2.0); optional so older ones keep working.
  code: Type.Optional(Type.String({ maxLength: 20 })),
  suggestion: Type.Optional(Type.String({ maxLength: 500 })),
  snippet: Type.Optional(Type.String({ maxLength: 1000 })),
});

export const ExplainErrorRequestSchema = Type.Object({
  source: Type.String({ minLength: 1 }),
  diagnostics: Type.Array(DiagnosticSchema, { minItems: 1 }),
});
export type ExplainErrorRequestBody = Static<typeof ExplainErrorRequestSchema>;
