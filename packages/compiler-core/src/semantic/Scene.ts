import type { Span } from "../ast/Span.js";

/**
 * Intermediate representation produced by the SemanticAnalyzer and consumed
 * by the CodeGenerator. Neither side needs to know about the AST: the
 * analyzer's job ends here, the generator's job starts here.
 */
export interface CanvasConfig {
  readonly width: number;
  readonly height: number;
}

export type ParamValue = number | string;

/** How a parameter's value was written in the source: decides whether a visual edit can safely rewrite it. */
export type ParamEditability =
  /** A plain literal (`x=100`, `color=rojo`): can be rewritten in place. */
  | "literal"
  /** Computed (`x=cx+10`, `radio=r*2`): never silently replaced by a number. */
  | "expression"
  /** Not written; the default applies. A visual edit can append `name=value`. */
  | "default";

export interface ParamOrigin {
  readonly editability: ParamEditability;
  /** Source range of the value (absent for `default`). */
  readonly span?: Span;
  /** Variables an `expression` reads: where the user would edit instead. */
  readonly dependsOn?: readonly string[];
}

/**
 * Where a shape came from in the source. Shared by every instance of the same
 * call site, so a loop that emits 20 circles points all 20 at one `site`.
 */
export interface SourceOrigin {
  /** Ordinal of the call site in source order (stable under value-only edits). */
  readonly site: number;
  /** The whole call (`crear_circulo(...)`), without the trailing ';'. */
  readonly callSpan: Span;
  /** The whole statement without its ';': `c1 = crear_circulo(...)` for a binding, the call itself otherwise, the whole block for a group. */
  readonly statementSpan: Span;
  /** Where a missing argument can be appended: right after the last argument (or just before the ')' of an empty list). */
  readonly appendAt: number;
  /** True when the call already has arguments, so an appended one needs a ", " first. */
  readonly hasArgs: boolean;
  /** True when the site sits inside a loop or function: editing it affects every instance. */
  readonly dynamic: boolean;
  /** How many shapes this site produced in this run (> 1 for a loop body or a called function). */
  readonly instances: number;
  readonly params: Readonly<Record<string, ParamOrigin>>;
}

export interface ResolvedShape {
  /** Stable across recompiles of the same program: the binding name, or `<kind>@<site>[.<instance>]`. */
  readonly id: string;
  readonly kind: string;
  readonly params: Readonly<Record<string, ParamValue>>;
  /** Innermost enclosing group, if any. */
  readonly groupId?: string;
  readonly origin?: SourceOrigin;
  /** Which execution of the site produced this shape (0 for a site that runs once). */
  readonly instance?: number;
}

export interface ResolvedConnection {
  readonly fromId: string;
  readonly toId: string;
  readonly params: Readonly<Record<string, ParamValue>>;
  readonly origin?: SourceOrigin;
}

export interface ResolvedGroup {
  readonly id: string;
  readonly parentId?: string;
  /** x, y (translation), escala, rotacion (degrees), opacidad: all numbers. */
  readonly params: Readonly<Record<string, number>>;
  readonly origin?: SourceOrigin;
}

export interface Scene {
  readonly canvas: CanvasConfig;
  readonly shapes: readonly ResolvedShape[];
  readonly connections: readonly ResolvedConnection[];
  /** Transform groups (`grupo(...) { }`). Shapes reference them by `groupId`; shapes are listed in paint order. */
  readonly groups?: readonly ResolvedGroup[];
}
