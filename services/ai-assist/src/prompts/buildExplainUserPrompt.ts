import type { ReportedDiagnostic } from "../explanation/ReportedDiagnostic.js";
import { wrap } from "../assist/guard.js";

export function buildExplainUserPrompt(source: string, diagnostics: readonly ReportedDiagnostic[]): string {
  const numberedSource = source
    .split("\n")
    .map((line, index) => `${index + 1}: ${line}`)
    .join("\n");

  const diagnosticsList = diagnostics
    .map((d) => {
      const code = d.code ? ` ${d.code}` : "";
      const hint = d.suggestion ? ` Sugerencia del compilador: ${d.suggestion}` : "";
      return `- (${d.position.line}:${d.position.column}) [${d.severity}${code}] ${d.message}${hint}`;
    })
    .join("\n");

  // Both parts come from the client (the diagnostics are reported, not recomputed), so both are tagged as data.
  return [
    "Código fuente:",
    wrap("codigo_actual", numberedSource),
    "",
    "Diagnósticos del compilador:",
    wrap("errores_del_compilador", diagnosticsList),
  ].join("\n");
}
