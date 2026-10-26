import { createDefaultPipeline, type CompileResult, type Diagnostic } from "@saramariaojeda9559/compiler-core";
import { EXPORT_CONTENT_TYPES } from "../config/export.config.js";
import type { ExportFormat, IExporter } from "../export/IExporter.js";
import { SvgExporter } from "../export/SvgExporter.js";
import { PngExporter } from "../export/PngExporter.js";
import { toAstJson } from "./toAstJson.js";

export interface AnalyzeOutcome {
  readonly success: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

export interface StagesOutcome {
  readonly success: boolean;
  readonly tokens: readonly { type: string; lexeme: string; position: { line: number; column: number } }[];
  readonly astJson: string;
  readonly sceneJson: string;
  readonly svg: string | null;
  readonly diagnostics: readonly Diagnostic[];
  readonly timings: readonly { stage: string; durationMs: number }[];
}

export type ExportOutcome =
  | { readonly success: true; readonly content: Buffer; readonly contentType: string }
  | { readonly success: false; readonly diagnostics: readonly Diagnostic[] };

export interface SupportedFormat {
  readonly format: ExportFormat;
  readonly contentType: string;
}

/**
 * The compiler service's use cases, independent of any transport. The HTTP
 * server (src/http) and the gRPC server (src/grpc) are both thin adapters
 * over this class — neither contains compile/export logic of its own, so
 * they can't drift apart.
 *
 * A fresh pipeline is built per call: SemanticAnalyzer holds per-compile
 * state (symbol table), so nothing here is shared between requests.
 */
export class CompilerApplication {
  private readonly exporters: ReadonlyMap<ExportFormat, IExporter>;

  constructor(exporters: readonly IExporter[] = [new SvgExporter(), new PngExporter()]) {
    this.exporters = new Map(exporters.map((exporter) => [exporter.format, exporter]));
  }

  compile(source: string): CompileResult {
    return createDefaultPipeline().compile(source);
  }

  analyze(source: string): AnalyzeOutcome {
    const { success, diagnostics } = createDefaultPipeline().compile(source);
    return { success, diagnostics };
  }

  stages(source: string): StagesOutcome {
    const stages = createDefaultPipeline().compileWithStages(source);
    return {
      success: stages.result.success,
      tokens: stages.tokens.map(({ type, lexeme, position }) => ({ type, lexeme, position })),
      astJson: toAstJson(stages.program),
      sceneJson: JSON.stringify(stages.scene),
      svg: stages.result.svg,
      diagnostics: stages.result.diagnostics,
      timings: stages.timings,
    };
  }

  async export(source: string, format: ExportFormat): Promise<ExportOutcome> {
    const exporter = this.exporters.get(format);
    if (!exporter) {
      throw new UnsupportedFormatError(format);
    }

    const result = this.compile(source);
    if (!result.success || result.svg === null) {
      return { success: false, diagnostics: result.diagnostics };
    }

    return { success: true, content: await exporter.export(result.svg), contentType: EXPORT_CONTENT_TYPES[format] };
  }

  supportedFormats(): readonly SupportedFormat[] {
    return [...this.exporters.keys()].map((format) => ({ format, contentType: EXPORT_CONTENT_TYPES[format] }));
  }
}

export class UnsupportedFormatError extends Error {
  constructor(format: string) {
    super(`Formato de exportación no soportado: ${format}`);
    this.name = "UnsupportedFormatError";
  }
}
