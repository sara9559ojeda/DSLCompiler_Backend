import type { Diagnostic } from "@saramariaojeda9559/compiler-core";
import { wrap } from "../assist/guard.js";

/** The first request of /suggest: the user's description, tagged as data. */
export function buildSuggestUserPrompt(request: string): string {
  return wrap("solicitud_del_usuario", request);
}

/** Fed back to Claude when its first attempt fails to compile — grounds the retry in the real errors. */
export function buildRetryPrompt(
  originalPrompt: string,
  invalidSource: string,
  diagnostics: readonly Diagnostic[],
): string {
  const diagnosticsList = diagnostics.map((d) => `- (${d.position.line}:${d.position.column}) ${d.message}`).join("\n");

  return [
    wrap("solicitud_del_usuario", originalPrompt),
    "",
    "Tu intento anterior no compiló:",
    wrap("intento_anterior", invalidSource),
    "",
    wrap("errores_del_compilador", diagnosticsList),
    "",
    "Genera una nueva versión que corrija estos errores y cumpla la gramática exactamente.",
  ].join("\n");
}
