import type { Diagnostic } from "@saramariaojeda9559/compiler-core";
import { buildGrammarContext } from "./buildGrammarContext.js";
import { wrap } from "../assist/guard.js";
import { SECURITY_RULES } from "./securityRules.js";

const OUTPUT_RULES_CODE = [
  "Reglas de salida:",
  "- Responde SOLO con el programa en el lenguaje, sin explicaciones ni bloques de markdown ni texto adicional.",
  "- No inventes comandos, parámetros ni funciones que no estén en la descripción del lenguaje.",
  "- Mantén el programa compacto: usa bucles, funciones y grupos en lugar de repetir instrucciones.",
  "- El lienzo mide 800x600 salvo en los diagramas, que lo amplían solos.",
].join("\n");

export function buildGenerateSystemPrompt(): string {
  return [
    'Eres un generador de programas para el lenguaje de "Compilador de Imágenes" (versión 2.0). Tu única salida es código en ese lenguaje.',
    "",
    buildGrammarContext(),
    "",
    OUTPUT_RULES_CODE,
    "",
    SECURITY_RULES,
  ].join("\n");
}

export function buildModifySystemPrompt(): string {
  return [
    'Eres un editor de programas del lenguaje de "Compilador de Imágenes" (versión 2.0). Recibes un programa existente y una instrucción de cambio.',
    "Devuelve el programa COMPLETO ya modificado, cambiando solo lo necesario: conserva los comentarios, el orden, los nombres, las variables y el formato de lo que no se toca.",
    "",
    buildGrammarContext(),
    "",
    OUTPUT_RULES_CODE,
    "",
    SECURITY_RULES,
  ].join("\n");
}

export function buildExplainCodeSystemPrompt(): string {
  return [
    'Eres un tutor que explica programas del lenguaje de "Compilador de Imágenes" (versión 2.0) a quien lo está aprendiendo.',
    "Explica en español, breve y claro: qué dibuja el programa, cómo está organizado (variables, bucles, funciones, grupos, diagramas) y, si hay errores del compilador, qué significan y cómo corregirlos sin reescribir todo el programa.",
    "Usa listas cortas y fragmentos de código entre comillas invertidas simples. No devuelvas el programa completo.",
    "",
    buildGrammarContext(),
    "",
    SECURITY_RULES,
  ].join("\n");
}

const numbered = (source: string): string =>
  source
    .split("\n")
    .map((line, index) => `${index + 1}: ${line}`)
    .join("\n");

const formatDiagnostics = (diagnostics: readonly Diagnostic[]): string =>
  diagnostics
    .map(
      (d) =>
        `- (${d.position.line}:${d.position.column}) [${d.code ?? d.severity}] ${d.message}${d.suggestion ? ` Sugerencia: ${d.suggestion}` : ""}`,
    )
    .join("\n");

export const buildGenerateUserPrompt = (request: string): string => wrap("solicitud_del_usuario", request);

export const buildModifyUserPrompt = (request: string, source: string): string =>
  [wrap("codigo_actual", source), "", wrap("solicitud_del_usuario", request)].join("\n");

/** Fed back when an attempt doesn't compile: the real diagnostics, so the next try is grounded in them. */
export function buildRepairUserPrompt(
  request: string,
  originalSource: string | undefined,
  failedSource: string,
  diagnostics: readonly Diagnostic[],
): string {
  return [
    ...(originalSource === undefined ? [] : [wrap("codigo_actual", originalSource), ""]),
    wrap("solicitud_del_usuario", request),
    "",
    "Tu intento anterior no compiló:",
    wrap("intento_anterior", failedSource),
    "",
    wrap("errores_del_compilador", formatDiagnostics(diagnostics)),
    "",
    "Devuelve una nueva versión completa que corrija estos errores y cumpla la solicitud.",
  ].join("\n");
}

export function buildExplainCodeUserPrompt(source: string, question: string, diagnostics: readonly Diagnostic[]): string {
  return [
    wrap("codigo_actual", numbered(source)),
    "",
    diagnostics.length > 0 ? wrap("errores_del_compilador", formatDiagnostics(diagnostics)) : "El compilador no reporta errores.",
    "",
    wrap("solicitud_del_usuario", question || "Explica qué hace este programa."),
  ].join("\n");
}
