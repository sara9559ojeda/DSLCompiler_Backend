// Original file: proto/compiler/v1/compiler.proto

import type { Severity as _compiler_v1_Severity, Severity__Output as _compiler_v1_Severity__Output } from '../../compiler/v1/Severity.js';
import type { SourcePosition as _compiler_v1_SourcePosition, SourcePosition__Output as _compiler_v1_SourcePosition__Output } from '../../compiler/v1/SourcePosition.js';

export interface Diagnostic {
  'severity'?: (_compiler_v1_Severity);
  'message'?: (string);
  'position'?: (_compiler_v1_SourcePosition | null);
  'code'?: (string);
  'suggestion'?: (string);
  'snippet'?: (string);
  '_suggestion'?: "suggestion";
  '_snippet'?: "snippet";
}

export interface Diagnostic__Output {
  'severity': (_compiler_v1_Severity__Output);
  'message': (string);
  'position': (_compiler_v1_SourcePosition__Output | null);
  'code': (string);
  'suggestion'?: (string);
  'snippet'?: (string);
  '_suggestion'?: "suggestion";
  '_snippet'?: "snippet";
}
