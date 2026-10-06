/**
 * Intermediate representation produced by the SemanticAnalyzer and consumed
 * by the CodeGenerator. Neither side needs to know about the AST: the
 * analyzer's job ends here, the generator's job starts here.
 */
export interface CanvasConfig {
  readonly width: number;
  readonly height: number;
}

export interface ResolvedShape {
  readonly id: string;
  readonly kind: string;
  readonly params: Readonly<Record<string, number | string>>;
}

export interface ResolvedConnection {
  readonly fromId: string;
  readonly toId: string;
  readonly params: Readonly<Record<string, number | string>>;
}

export interface Scene {
  readonly canvas: CanvasConfig;
  readonly shapes: readonly ResolvedShape[];
  readonly connections: readonly ResolvedConnection[];
}
