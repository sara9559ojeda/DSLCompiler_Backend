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
export { SvgExporter } from "./export/SvgExporter.js";
export { PngExporter } from "./export/PngExporter.js";
export type { IExporter, ExportFormat } from "./export/IExporter.js";
export { Lexer } from "./lexer/Lexer.js";
export { Parser } from "./parser/Parser.js";
export { SemanticAnalyzer } from "./semantic/SemanticAnalyzer.js";
export type { Scene, ResolvedShape, ResolvedConnection } from "./semantic/Scene.js";

/**
 * Composition root: wires the default registry/renderer implementations
 * into a ready-to-use pipeline. Callers who need different wiring (tests, a
 * future PNG-first renderer, etc.) can construct CompilerPipeline directly.
 */
export function createDefaultPipeline(): CompilerPipeline {
  const registry = new DefaultShapeRegistry(SHAPE_DEFINITIONS);
  const colorResolver = new ColorResolver(NAMED_COLORS);
  const renderer = new SvgShapeRenderer();
  return new CompilerPipeline(registry, colorResolver, renderer);
}
