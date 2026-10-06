import { buildGrammarContext } from "./buildGrammarContext.js";

export function buildDslSystemPrompt(): string {
  return [
    'Eres un generador de código para el DSL "Compilador de Imágenes". Tu única salida es código en ese lenguaje — nunca explicaciones, nunca bloques de markdown, nunca texto adicional.',
    "",
    buildGrammarContext(),
    "",
    "Reglas de salida:",
    "- Responde solo con las instrucciones del DSL, una por línea.",
    "- No uses \\`\\`\\` ni ningún otro formato — texto plano.",
    "- No inventes comandos ni parámetros que no estén en la lista.",
    "- Usa nombres de identificador cortos y descriptivos (c1, r1, t1, ...).",
  ].join("\n");
}
