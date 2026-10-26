/**
 * Public surface of the compiler core: Lexer → Parser → SemanticAnalyzer →
 * CodeGenerator → SVG. Pure TypeScript, zero external dependencies — safe
 * to import from a browser bundle (apps/web's Web Worker) or any Node
 * service alike (services/compiler's HTTP server, services/ai-assist's
 * validator/prompt builder).
 *
 * Deliberately excludes export/* (SvgExporter/PngExporter) and anything
 * HTTP-related — those stay in services/compiler. PngExporter in particular
 * dynamically imports `sharp`, a native Node addon that must never end up
 * in a browser bundle; keeping it out of this package is what makes it
 * safe to install from a frontend repo.
 *
 * Has zero package dependencies on purpose (the DSL registry/diagnostics
 * types live here now, not in @compiler-img/shared) — see
 * docs/adr/0009-merge-shared-registry-into-compiler-core.md. A package
 * installed via a git dependency can't reliably resolve *its own* git
 * dependencies at `prepare` time, so the only robust shape for a
 * git-installable package is one with no unpublished dependencies at all.
 */
import { SHAPE_DEFINITIONS } from "./registry/shapes.config.js";
import { NAMED_COLORS } from "./registry/colors.config.js";
import { DefaultShapeRegistry } from "./semantic/ShapeRegistry.js";
import { ColorResolver } from "./semantic/ColorResolver.js";
import { SvgShapeRenderer } from "./codegen/SvgShapeRenderer.js";
import { CompilerPipeline } from "./pipeline/CompilerPipeline.js";
import { SceneOptimizer, type IScenePass } from "./optimizer/SceneOptimizer.js";
import { DEFAULT_SCENE_PASSES } from "./optimizer/passes.js";

export { CompilerPipeline } from "./pipeline/CompilerPipeline.js";
export type { CompileResult } from "./pipeline/CompileResult.js";
export type { CompilationStages, StageName, StageTiming } from "./pipeline/CompilationStages.js";
export type { Token } from "./lexer/Token.js";
export type { ProgramNode } from "./ast/nodes/ProgramNode.js";
export { DefaultShapeRegistry } from "./semantic/ShapeRegistry.js";
export type { IShapeRegistry } from "./semantic/ShapeRegistry.js";
export { ColorResolver } from "./semantic/ColorResolver.js";
export { SvgShapeRenderer } from "./codegen/SvgShapeRenderer.js";
export type { IShapeRenderer } from "./codegen/IShapeRenderer.js";
export { Lexer } from "./lexer/Lexer.js";
export { Parser } from "./parser/Parser.js";
export { SemanticAnalyzer } from "./semantic/SemanticAnalyzer.js";
export type { Scene, ResolvedShape, ResolvedConnection } from "./semantic/Scene.js";
export type { Diagnostic, DiagnosticSeverity, SourcePosition } from "./diagnostics/Diagnostic.js";
export { DIAGNOSTIC_CODES, type DiagnosticCode } from "./diagnostics/DiagnosticCodes.js";
export { closestMatch, editDistance } from "./diagnostics/suggest.js";
export type { ParamDefinition, ParamType } from "./registry/ParamDefinition.js";
export type { ShapeDefinition, ShapeCategory } from "./registry/ShapeDefinition.js";
export { SHAPE_DEFINITIONS } from "./registry/shapes.config.js";
export { NAMED_COLORS, DEFAULT_SHAPE_COLOR } from "./registry/colors.config.js";
export {
  DEFAULT_FONT_SIZE,
  DEFAULT_CONNECTION_TYPE,
  DEFAULT_STROKE_WIDTH,
  CONNECTION_TYPES,
} from "./registry/dsl-defaults.config.js";

export { SceneOptimizer } from "./optimizer/SceneOptimizer.js";
export type { IScenePass, PassReport, OptimizationResult } from "./optimizer/SceneOptimizer.js";
export {
  DEFAULT_SCENE_PASSES,
  removeOffCanvasShapes,
  removeDegenerateShapes,
  removeOccludedShapes,
} from "./optimizer/passes.js";

export interface PipelineOptions {
  /** `true` = DEFAULT_SCENE_PASSES; or pass your own list. Off by default, so output is unchanged unless asked. */
  readonly optimize?: boolean | readonly IScenePass[];
}

export function createDefaultPipeline(options: PipelineOptions = {}): CompilerPipeline {
  const registry = new DefaultShapeRegistry(SHAPE_DEFINITIONS);
  const colorResolver = new ColorResolver(NAMED_COLORS);
  const renderer = new SvgShapeRenderer();
  const passes = options.optimize === true ? DEFAULT_SCENE_PASSES : options.optimize || [];
  const optimizer = passes.length > 0 ? new SceneOptimizer(passes) : undefined;
  return new CompilerPipeline(registry, colorResolver, renderer, optimizer);
}
