import { Type, type Static } from "@sinclair/typebox";

/**
 * Wire contract for the Projects service, shared by the gateway (validates
 * before proxying) and the Projects service itself (validates again as an
 * internal boundary) — same rationale as CompileContract.ts.
 *
 * Email uses a plain regex pattern rather than TypeBox's `format: "email"`:
 * Fastify's default AJV instance has no format plugin registered, so an
 * unrecognized `format` keyword would fail schema compilation.
 */
const EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

export const RegisterRequestSchema = Type.Object({
  email: Type.String({ pattern: EMAIL_PATTERN }),
  password: Type.String({ minLength: 8 }),
});
export type RegisterRequestBody = Static<typeof RegisterRequestSchema>;

export const LoginRequestSchema = Type.Object({
  email: Type.String({ pattern: EMAIL_PATTERN }),
  password: Type.String({ minLength: 1 }),
});
export type LoginRequestBody = Static<typeof LoginRequestSchema>;

export const CreateProjectRequestSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 200 }),
  dslSource: Type.String(),
});
export type CreateProjectRequestBody = Static<typeof CreateProjectRequestSchema>;

export const UpdateProjectRequestSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  dslSource: Type.Optional(Type.String()),
});
export type UpdateProjectRequestBody = Static<typeof UpdateProjectRequestSchema>;
