/**
 * Browser-safe entry point. Deliberately excludes ./index.ts's export/*
 * re-exports (SvgExporter/PngExporter) — PngExporter dynamically imports
 * `sharp`, a native Node addon, which must never end up in a browser bundle.
 * The frontend's compile-preview Web Worker imports from here so it runs
 * the exact same Lexer/Parser/SemanticAnalyzer/CodeGenerator as the backend
 * compiler service, just without the Node-only export path.
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
