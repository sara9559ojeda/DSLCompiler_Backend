// Original file: proto/export/v1/export.proto

export const ExportFormat = {
  EXPORT_FORMAT_UNSPECIFIED: 'EXPORT_FORMAT_UNSPECIFIED',
  EXPORT_FORMAT_SVG: 'EXPORT_FORMAT_SVG',
  EXPORT_FORMAT_PNG: 'EXPORT_FORMAT_PNG',
} as const;

export type ExportFormat =
  | 'EXPORT_FORMAT_UNSPECIFIED'
  | 0
  | 'EXPORT_FORMAT_SVG'
  | 1
  | 'EXPORT_FORMAT_PNG'
  | 2

export type ExportFormat__Output = typeof ExportFormat[keyof typeof ExportFormat]
