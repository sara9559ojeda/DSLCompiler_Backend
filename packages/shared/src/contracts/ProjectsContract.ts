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

/**
 * Trusted internal header the gateway sets, carrying the user id it just
 * verified from the caller's JWT. The Projects service reads it instead of
 * verifying the token a second time — it's only reachable through the
 * gateway. Shared here so both sides use the exact same header name.
 */
export const USER_ID_HEADER = "x-user-id";
