import type { ReportedDiagnostic } from "../explanation/ReportedDiagnostic.js";

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

  return ["Código fuente:", numberedSource, "", "Diagnósticos del compilador:", diagnosticsList].join("\n");
}
