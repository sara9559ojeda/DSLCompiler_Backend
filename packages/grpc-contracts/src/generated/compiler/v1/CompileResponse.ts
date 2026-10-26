// Original file: proto/compiler/v1/compiler.proto

import type { Diagnostic as _compiler_v1_Diagnostic, Diagnostic__Output as _compiler_v1_Diagnostic__Output } from '../../compiler/v1/Diagnostic.js';

export interface CompileResponse {
  'success'?: (boolean);
  'svg'?: (string);
  'diagnostics'?: (_compiler_v1_Diagnostic)[];
  '_svg'?: "svg";
}

export interface CompileResponse__Output {
  'success': (boolean);
  'svg'?: (string);
  'diagnostics': (_compiler_v1_Diagnostic__Output)[];
  '_svg'?: "svg";
}
