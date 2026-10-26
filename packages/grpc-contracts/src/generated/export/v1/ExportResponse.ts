// Original file: proto/export/v1/export.proto

import type { Diagnostic as _compiler_v1_Diagnostic, Diagnostic__Output as _compiler_v1_Diagnostic__Output } from '../../compiler/v1/Diagnostic.js';

export interface ExportResponse {
  'success'?: (boolean);
  'content'?: (Buffer | Uint8Array | string);
  'contentType'?: (string);
  'diagnostics'?: (_compiler_v1_Diagnostic)[];
}

export interface ExportResponse__Output {
  'success': (boolean);
  'content': (Buffer);
  'contentType': (string);
  'diagnostics': (_compiler_v1_Diagnostic__Output)[];
}
