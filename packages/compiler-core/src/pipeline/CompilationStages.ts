import type { Token } from "../lexer/Token.js";
import type { ProgramNode } from "../ast/nodes/ProgramNode.js";
import type { Scene } from "../semantic/Scene.js";
import type { CompileResult } from "./CompileResult.js";

export type StageName = "lexer" | "parser" | "semantic" | "codegen";

export interface StageTiming {
  readonly stage: StageName;
  readonly durationMs: number;
}

/** Every intermediate artifact of one compile. `codegen` is absent from `timings` when there were errors. */
export interface CompilationStages {
  readonly result: CompileResult;
  readonly tokens: readonly Token[];
  readonly program: ProgramNode;
  readonly scene: Scene;
  readonly timings: readonly StageTiming[];
}
