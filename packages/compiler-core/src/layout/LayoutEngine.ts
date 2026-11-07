/**
 * Port for automatic diagram layout. The analyzer depends on this interface,
 * never on a concrete library, so the engine can be swapped (Dagre today, ELK
 * tomorrow) without touching the language.
 */
export interface LayoutNode {
  readonly id: string;
  readonly width: number;
  readonly height: number;
}

export interface LayoutEdge {
  readonly from: string;
  readonly to: string;
}

export interface LayoutOptions {
  /** `vertical` flows top→bottom, `horizontal` left→right. */
  readonly direction: "vertical" | "horizontal";
  /** Gap between neighbouring nodes, in canvas units. */
  readonly spacing: number;
}

/** Top-left corner of each node, with the whole drawing's top-left normalised to (0, 0). Deterministic. */
export type LayoutResult = ReadonlyMap<string, { readonly x: number; readonly y: number }>;

export interface ILayoutEngine {
  layout(nodes: readonly LayoutNode[], edges: readonly LayoutEdge[], options: LayoutOptions): LayoutResult;
}
