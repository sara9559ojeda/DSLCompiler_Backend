// Original file: proto/compiler/v1/compiler.proto

export const Severity = {
  SEVERITY_UNSPECIFIED: 'SEVERITY_UNSPECIFIED',
  SEVERITY_ERROR: 'SEVERITY_ERROR',
  SEVERITY_WARNING: 'SEVERITY_WARNING',
} as const;

export type Severity =
  | 'SEVERITY_UNSPECIFIED'
  | 0
  | 'SEVERITY_ERROR'
  | 1
  | 'SEVERITY_WARNING'
  | 2

export type Severity__Output = typeof Severity[keyof typeof Severity]
