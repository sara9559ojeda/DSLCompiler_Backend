import type { Token } from "../lexer/Token.js";
import type { ProgramNode } from "../ast/nodes/ProgramNode.js";
import type { Scene } from "../semantic/Scene.js";
import type { CompileResult } from "./CompileResult.js";
import type { PassReport } from "../optimizer/SceneOptimizer.js";

export type StageName = "lexer" | "parser" | "semantic" | "optimizer" | "codegen";

export interface StageTiming {
  readonly stage: StageName;
  readonly durationMs: number;
}

/** Every intermediate artifact of one compile. `optimizer`/`codegen` are absent from `timings` when they didn't run. */
export interface CompilationStages {
  readonly result: CompileResult;
  readonly tokens: readonly Token[];
  readonly program: ProgramNode;
  /** The IR straight out of semantic analysis. */
  readonly scene: Scene;
  /** Present only when the pipeline has an optimizer and there were no errors. */
  readonly optimizedScene?: Scene;
  readonly optimization?: readonly PassReport[];
  readonly timings: readonly StageTiming[];
}
