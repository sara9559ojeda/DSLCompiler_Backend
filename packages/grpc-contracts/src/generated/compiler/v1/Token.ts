// Original file: proto/compiler/v1/compiler.proto

import type { SourcePosition as _compiler_v1_SourcePosition, SourcePosition__Output as _compiler_v1_SourcePosition__Output } from '../../compiler/v1/SourcePosition.js';

export interface Token {
  'type'?: (string);
  'lexeme'?: (string);
  'position'?: (_compiler_v1_SourcePosition | null);
}

export interface Token__Output {
  'type': (string);
  'lexeme': (string);
  'position': (_compiler_v1_SourcePosition__Output | null);
}
