import { Lexer } from "../lexer/Lexer.js";
import { Parser } from "../parser/Parser.js";
import { SemanticAnalyzer } from "../semantic/SemanticAnalyzer.js";
import type { IShapeRegistry } from "../semantic/ShapeRegistry.js";
import type { ColorResolver } from "../semantic/ColorResolver.js";
import { CodeGenerator } from "../codegen/CodeGenerator.js";
import type { IShapeRenderer } from "../codegen/IShapeRenderer.js";
import type { CompileResult } from "./CompileResult.js";

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
    const lexResult = new Lexer(source).tokenize();
    const parseResult = new Parser(lexResult.tokens).parse();
    const semanticResult = new SemanticAnalyzer(this.registry, this.colorResolver).analyze(parseResult.program);

    const diagnostics = [...lexResult.diagnostics, ...parseResult.diagnostics, ...semanticResult.diagnostics];
    const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");

    if (hasErrors) {
      return { success: false, svg: null, diagnostics };
    }

    const svg = new CodeGenerator(this.renderer).generate(semanticResult.scene);
    return { success: true, svg, diagnostics };
  }
}
