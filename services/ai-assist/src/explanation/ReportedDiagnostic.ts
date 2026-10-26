import type { Diagnostic } from "@saramariaojeda9559/compiler-core";

/**
 * A diagnostic as a client reports it to /explain-error. Older clients only
 * send severity/message/position; newer ones also send the catalog code,
 * suggestion and snippet — the service works with either.
 */
export type ReportedDiagnostic = Pick<Diagnostic, "severity" | "message" | "position"> &
  Partial<Pick<Diagnostic, "suggestion" | "snippet">> & { readonly code?: string };
