/**
 * Full server-side surface: re-exports the compiler core
 * (@saramariaojeda9559/compiler-core) plus the Node-only export path
 * (SvgExporter/PngExporter — PngExporter needs `sharp`, a native addon,
 * which is exactly why it's *not* in compiler-core).
 */
export {
  createDefaultPipeline,
  CompilerPipeline,
  DefaultShapeRegistry,
  ColorResolver,
  SvgShapeRenderer,
  Lexer,
  Parser,
  SemanticAnalyzer,
  type CompileResult,
  type IShapeRegistry,
  type IShapeRenderer,
  type Scene,
  type ResolvedShape,
  type ResolvedConnection,
} from "@saramariaojeda9559/compiler-core";
export { SvgExporter } from "./export/SvgExporter.js";
export { PngExporter } from "./export/PngExporter.js";
export type { IExporter, ExportFormat } from "./export/IExporter.js";
export { CompilerApplication } from "./application/CompilerApplication.js";
export { buildGrpcServer, startGrpcServer } from "./grpc/server.js";
