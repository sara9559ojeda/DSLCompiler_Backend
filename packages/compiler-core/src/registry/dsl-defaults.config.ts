/** Default values referenced by SHAPE_DEFINITIONS for optional parameters. */
export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_CONNECTION_TYPE = "linea";
export const DEFAULT_STROKE_WIDTH = 2;

export const CONNECTION_TYPES = ["linea", "flecha"] as const;

export const NODE_TYPES = ["caja", "redondeado", "inicio", "decision", "circulo"] as const;
export const DIRECTIONS = ["vertical", "horizontal"] as const;
export const DEFAULT_DIAGRAM_SPACING = 60;
export const DEFAULT_DIAGRAM_ORIGIN = 40;

/** What each diagram type means: its flow direction and the node shape its `nodo`s take unless they say otherwise. */
export const DIAGRAM_TYPES: Readonly<Record<string, { readonly direction: (typeof DIRECTIONS)[number]; readonly nodeType: (typeof NODE_TYPES)[number]; readonly spacing: number }>> = {
  flujo: { direction: "vertical", nodeType: "redondeado", spacing: 50 },
  arquitectura: { direction: "horizontal", nodeType: "caja", spacing: 70 },
  organigrama: { direction: "vertical", nodeType: "caja", spacing: 40 },
  proceso: { direction: "horizontal", nodeType: "redondeado", spacing: 60 },
  red: { direction: "horizontal", nodeType: "circulo", spacing: 60 },
};

export const DEFAULT_OPACITY = 1;
export const DEFAULT_ROTATION = 0;
