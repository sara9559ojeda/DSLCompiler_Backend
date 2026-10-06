# ADR 0003: `IShapeRenderer` e `IExporter` como puntos de extensión

## Contexto

La salida del compilador debe poder crecer (hoy SVG; PNG por rasterizado; a
futuro quizá Canvas u otro backend vectorial) sin reescribir el
`CodeGenerator` ni el `SemanticAnalyzer`.

## Decisión

Se introducen dos abstracciones independientes:

- `IShapeRenderer` (`renderShape`, `renderConnection`, `wrapDocument`):
  produce el marcado de cada figura/conexión. `CodeGenerator` depende de esta
  interfaz, no de `SvgShapeRenderer` (Dependency Inversion). Hoy solo existe
  `SvgShapeRenderer`; un `CanvasShapeRenderer` futuro sería sustituible sin
  cambiar `CodeGenerator` (Liskov).
- `IExporter` (`export(svg): Promise<Buffer>`): convierte el SVG generado a
  un formato de salida binario. `SvgExporter` es un passthrough;
  `PngExporter` rasteriza con `sharp`. Ambos son intercambiables donde se
  espera un `IExporter`.

## Consecuencias

- Agregar un formato de exportación (p. ej. PDF) es agregar una clase que
  implemente `IExporter`, sin tocar el pipeline de compilación.
- El `CompilerPipeline` termina en un string SVG; la conversión a binario
  (SVG/PNG) es una responsabilidad posterior y explícita del llamador (CLI o
  el futuro endpoint HTTP `/export`), no del compilador en sí.
