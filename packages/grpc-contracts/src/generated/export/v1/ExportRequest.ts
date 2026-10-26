// Original file: proto/export/v1/export.proto

import type { ExportFormat as _export_v1_ExportFormat, ExportFormat__Output as _export_v1_ExportFormat__Output } from '../../export/v1/ExportFormat.js';

export interface ExportRequest {
  'source'?: (string);
  'format'?: (_export_v1_ExportFormat);
}

export interface ExportRequest__Output {
  'source': (string);
  'format': (_export_v1_ExportFormat__Output);
}
