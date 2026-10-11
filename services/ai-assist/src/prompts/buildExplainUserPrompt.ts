import type { Diagnostic } from "@compiler-img/compiler-core";

export function buildExplainUserPrompt(source: string, diagnostics: readonly Diagnostic[]): string {
  const numberedSource = source
    .split("\n")
    .map((line, index) => `${index + 1}: ${line}`)
    .join("\n");

  const diagnosticsList = diagnostics
    .map((d) => `- (${d.position.line}:${d.position.column}) [${d.severity}] ${d.message}`)
    .join("\n");

  return ["Código fuente:", numberedSource, "", "Diagnósticos del compilador:", diagnosticsList].join("\n");
}
