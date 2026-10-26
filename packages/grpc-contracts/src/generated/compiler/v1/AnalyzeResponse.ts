// Original file: proto/compiler/v1/compiler.proto

import type { Diagnostic as _compiler_v1_Diagnostic, Diagnostic__Output as _compiler_v1_Diagnostic__Output } from '../../compiler/v1/Diagnostic.js';

export interface AnalyzeResponse {
  'success'?: (boolean);
  'diagnostics'?: (_compiler_v1_Diagnostic)[];
}

export interface AnalyzeResponse__Output {
  'success': (boolean);
  'diagnostics': (_compiler_v1_Diagnostic__Output)[];
}
