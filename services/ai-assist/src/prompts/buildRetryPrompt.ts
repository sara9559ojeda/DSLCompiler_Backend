import type { Diagnostic } from "@compiler-img/compiler-core";

/** Fed back to Claude when its first attempt fails to compile — grounds the retry in the real errors. */
export function buildRetryPrompt(
  originalPrompt: string,
  invalidSource: string,
  diagnostics: readonly Diagnostic[],
): string {
  const diagnosticsList = diagnostics.map((d) => `- (${d.position.line}:${d.position.column}) ${d.message}`).join("\n");

  return [
    `Pedido original: ${originalPrompt}`,
    "",
    "Tu intento anterior no compiló:",
    invalidSource,
    "",
    "Errores del compilador:",
    diagnosticsList,
    "",
    "Genera una nueva versión que corrija estos errores y cumpla la gramática exactamente.",
  ].join("\n");
}
