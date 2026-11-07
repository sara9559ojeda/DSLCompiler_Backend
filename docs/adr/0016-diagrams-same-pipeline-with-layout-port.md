# ADR 0016 — Diagramas inteligentes en el mismo pipeline, con layout detrás de un puerto

## Contexto
Hacían falta diagramas (flujo, arquitectura, organigrama, proceso, red) con layout automático, editables visualmente, sin un segundo renderizador ni un segundo modelo de escena.

## Decisión
- `diagrama <tipo> { ... }` es un **grupo** (`GroupNode` con `diagram`): comparte parser, intérprete (bucles/funciones valen), `Scene`, SVG, sanitizador y límites de ejecución.
- `nodo` es una figura más del registro (categoría `node`); se emite al ejecutarse y, al cerrar el bloque, el motor de layout fija `x`/`y` de los nodos que no los traen escritos.
- El layout es un **puerto** (`ILayoutEngine`) con **Dagre** (`@dagrejs/dagre`) como implementación: JavaScript puro, determinista, sin DOM; corre igual en el Web Worker y en el backend. Se evaluó ELK.js: más capaz, pero asíncrono y mucho más pesado para el worker.
- *Auto vs manual* se decide por el código: `x`/`y` escritos = manual. Arrastrar un nodo añade `x`/`y` (edición mínima); «volver al layout automático» los quita (`removeParams`/`resetLayout`).

## Simplificaciones documentadas
- Dagre no admite nodos fijos: los nodos manuales dejan su hueco en el layout.
- Conexiones rectas (no se usan los puntos de ruta de Dagre).
- El tamaño del nodo se estima por la longitud de la etiqueta (sin medir la fuente).
- Una sola línea de etiqueta por nodo.
