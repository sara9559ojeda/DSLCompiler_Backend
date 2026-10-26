// Original file: proto/compiler/v1/compiler.proto

import type { Token as _compiler_v1_Token, Token__Output as _compiler_v1_Token__Output } from '../../compiler/v1/Token.js';
import type { Diagnostic as _compiler_v1_Diagnostic, Diagnostic__Output as _compiler_v1_Diagnostic__Output } from '../../compiler/v1/Diagnostic.js';
import type { StageTiming as _compiler_v1_StageTiming, StageTiming__Output as _compiler_v1_StageTiming__Output } from '../../compiler/v1/StageTiming.js';

export interface CompilationStagesResponse {
  'success'?: (boolean);
  'tokens'?: (_compiler_v1_Token)[];
  'astJson'?: (string);
  'sceneJson'?: (string);
  'svg'?: (string);
  'diagnostics'?: (_compiler_v1_Diagnostic)[];
  'timings'?: (_compiler_v1_StageTiming)[];
  '_svg'?: "svg";
}

export interface CompilationStagesResponse__Output {
  'success': (boolean);
  'tokens': (_compiler_v1_Token__Output)[];
  'astJson': (string);
  'sceneJson': (string);
  'svg'?: (string);
  'diagnostics': (_compiler_v1_Diagnostic__Output)[];
  'timings': (_compiler_v1_StageTiming__Output)[];
  '_svg'?: "svg";
}
