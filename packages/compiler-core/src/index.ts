/**
 * Public surface of the compiler core: Lexer → Parser → SemanticAnalyzer →
 * CodeGenerator → SVG. Pure TypeScript, zero Node built-ins — safe to import
 * from a browser bundle (apps/web's Web Worker) or any Node service alike
 * (services/compiler's HTTP server, services/ai-assist's validator).
 *
 * Deliberately excludes export/* (SvgExporter/PngExporter) and anything
 * HTTP-related — those stay in services/compiler. PngExporter in particular
 * dynamically imports `sharp`, a native Node addon that must never end up
 * in a browser bundle; keeping it out of this package is what makes that
 * package safe to `npm install` from a frontend repo.
 */
import { SHAPE_DEFINITIONS, NAMED_COLORS } from "@compiler-img/shared";
import { DefaultShapeRegistry } from "./semantic/ShapeRegistry.js";
import { ColorResolver } from "./semantic/ColorResolver.js";
import { SvgShapeRenderer } from "./codegen/SvgShapeRenderer.js";
import { CompilerPipeline } from "./pipeline/CompilerPipeline.js";

export { CompilerPipeline } from "./pipeline/CompilerPipeline.js";
export type { CompileResult } from "./pipeline/CompileResult.js";
export { DefaultShapeRegistry } from "./semantic/ShapeRegistry.js";
export type { IShapeRegistry } from "./semantic/ShapeRegistry.js";
export { ColorResolver } from "./semantic/ColorResolver.js";
export { SvgShapeRenderer } from "./codegen/SvgShapeRenderer.js";
export type { IShapeRenderer } from "./codegen/IShapeRenderer.js";
export { Lexer } from "./lexer/Lexer.js";
export { Parser } from "./parser/Parser.js";
export { SemanticAnalyzer } from "./semantic/SemanticAnalyzer.js";
export type { Scene, ResolvedShape, ResolvedConnection } from "./semantic/Scene.js";

export function createDefaultPipeline(): CompilerPipeline {
  const registry = new DefaultShapeRegistry(SHAPE_DEFINITIONS);
  const colorResolver = new ColorResolver(NAMED_COLORS);
  const renderer = new SvgShapeRenderer();
  return new CompilerPipeline(registry, colorResolver, renderer);
}
