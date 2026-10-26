import { Lexer } from "../lexer/Lexer.js";
import { Parser } from "../parser/Parser.js";
import { SemanticAnalyzer } from "../semantic/SemanticAnalyzer.js";
import type { IShapeRegistry } from "../semantic/ShapeRegistry.js";
import type { ColorResolver } from "../semantic/ColorResolver.js";
import { CodeGenerator } from "../codegen/CodeGenerator.js";
import type { IShapeRenderer } from "../codegen/IShapeRenderer.js";
import type { CompileResult } from "./CompileResult.js";
import type { CompilationStages, StageName, StageTiming } from "./CompilationStages.js";

/**
 * `performance.now()` exists in browsers and Node alike, but this package
 * deliberately has no DOM or Node typings — so it's looked up structurally,
 * falling back to Date.now() on runtimes without it.
 */
const clock: { now(): number } = (globalThis as { performance?: { now(): number } }).performance ?? Date;

/**
 * Orchestrates the four classic compiler phases end to end. Every
 * dependency is injected (constructor), so the pipeline itself never
 * hardcodes which registry/renderer implementation it uses (DIP) — see
 * `createDefaultPipeline` in index.ts for the composition root.
 */
export class CompilerPipeline {
  constructor(
    private readonly registry: IShapeRegistry,
    private readonly colorResolver: ColorResolver,
    private readonly renderer: IShapeRenderer,
  ) {}

  compile(source: string): CompileResult {
    return this.compileWithStages(source).result;
  }

  /** Same compile, but keeps every intermediate artifact and how long each phase took (for inspectors/tooling). */
  compileWithStages(source: string): CompilationStages {
    const timings: StageTiming[] = [];
    const timed = <T>(stage: StageName, run: () => T): T => {
      const start = clock.now();
      const value = run();
      timings.push({ stage, durationMs: clock.now() - start });
      return value;
    };

    const lexResult = timed("lexer", () => new Lexer(source).tokenize());
    const parseResult = timed("parser", () => new Parser(lexResult.tokens).parse());
    const semanticResult = timed("semantic", () =>
      new SemanticAnalyzer(this.registry, this.colorResolver).analyze(parseResult.program),
    );

    const diagnostics = [...lexResult.diagnostics, ...parseResult.diagnostics, ...semanticResult.diagnostics];
    const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");

    const svg = hasErrors ? null : timed("codegen", () => new CodeGenerator(this.renderer).generate(semanticResult.scene));

    return {
      result: { success: !hasErrors, svg, diagnostics },
      tokens: lexResult.tokens,
      program: parseResult.program,
      scene: semanticResult.scene,
      timings,
    };
  }
}
