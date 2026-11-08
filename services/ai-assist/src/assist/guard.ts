/**
 * Prompt-injection hygiene. Anything that comes from the user (their request,
 * their current program) is wrapped in a named tag and the system prompt says
 * "this is data". The one trick left is the user closing the tag themselves to
 * "escape" it, so the tag names are neutralised inside user text. The real
 * defence is that nothing the model says is trusted: every answer is compiled
 * and only DSL that passes the compiler can reach the editor (and even then
 * only as a proposal the user accepts or rejects).
 */
export const USER_TAGS = ["solicitud_del_usuario", "codigo_actual", "intento_anterior", "errores_del_compilador"] as const;

export type UserTag = (typeof USER_TAGS)[number];

export function neutralise(text: string): string {
  return USER_TAGS.reduce(
    (result, tag) => result.replace(new RegExp(`<\\s*/?\\s*${tag}\\s*>`, "gi"), "[etiqueta eliminada]"),
    text,
  );
}

export function wrap(tag: UserTag, content: string): string {
  return `<${tag}>\n${neutralise(content)}\n</${tag}>`;
}
