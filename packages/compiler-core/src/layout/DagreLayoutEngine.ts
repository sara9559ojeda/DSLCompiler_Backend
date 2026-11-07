import dagre from "@dagrejs/dagre";
import type { ILayoutEngine, LayoutEdge, LayoutNode, LayoutOptions, LayoutResult } from "./LayoutEngine.js";

/**
 * Layered (Sugiyama-style) layout by Dagre: pure JavaScript, deterministic for
 * a given input order, no DOM. Edges are drawn straight by the renderer, so
 * only node positions are taken from it.
 */
export class DagreLayoutEngine implements ILayoutEngine {
  layout(nodes: readonly LayoutNode[], edges: readonly LayoutEdge[], options: LayoutOptions): LayoutResult {
    const graph = new dagre.graphlib.Graph({ multigraph: true });
    graph.setGraph({
      rankdir: options.direction === "vertical" ? "TB" : "LR",
      nodesep: options.spacing,
      ranksep: options.spacing * 1.2,
      marginx: 0,
      marginy: 0,
    });
    graph.setDefaultEdgeLabel(() => ({}));

    const known = new Set<string>();
    for (const node of nodes) {
      graph.setNode(node.id, { width: node.width, height: node.height });
      known.add(node.id);
    }
    edges.forEach((edge, index) => {
      if (known.has(edge.from) && known.has(edge.to) && edge.from !== edge.to) graph.setEdge(edge.from, edge.to, {}, `e${index}`);
    });

    dagre.layout(graph);

    const positions = new Map<string, { x: number; y: number }>();
    let minX = Infinity;
    let minY = Infinity;
    for (const node of nodes) {
      const placed = graph.node(node.id);
      const x = placed.x - node.width / 2;
      const y = placed.y - node.height / 2;
      positions.set(node.id, { x, y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
    }
    for (const [id, point] of positions) positions.set(id, { x: Math.round(point.x - minX), y: Math.round(point.y - minY) });
    return positions;
  }
}
