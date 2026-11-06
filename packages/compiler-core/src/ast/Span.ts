/** Half-open range `[start, end)` of UTF-16 offsets into the source text (the same offsets Monaco's model uses). */
export interface Span {
  readonly start: number;
  readonly end: number;
}

export const NO_SPAN: Span = { start: 0, end: 0 };

export const spanBetween = (from: Span, to: Span): Span => ({ start: from.start, end: to.end });
