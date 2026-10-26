# ADR 0014: Diagnósticos con código, optimizador de escena y sanitización del SVG

## Diagnósticos (compiler-core 0.2.0)

Cada `Diagnostic` ahora lleva:

- `code`: código estable del catálogo `DIAGNOSTIC_CODES`
  (`LEX-*` léxico, `SYN-*` sintaxis, `SEM-*` semántica). Los códigos nunca
  se renumeran ni reutilizan; los mensajes sí pueden cambiar de redacción.
- `suggestion` (opcional): siguiente paso concreto. Para nombres mal
  escritos (comandos, parámetros, colores, figuras) se calcula con
  distancia de edición: "¿Quisiste decir 'crear_circulo'?".
- `snippet` (opcional): la línea del código fuente, que agrega
  `CompilerPipeline`.

Los campos se agregaron al `.proto` como campos nuevos (4, 5, 6), así que
`compiler.v1` sigue siendo compatible. `/explain-error` los acepta como
opcionales: los clientes viejos siguen funcionando.

## Optimizador (`SceneOptimizer`)

Pases sobre el IR (`Scene`), configurables y apagados por defecto
(`createDefaultPipeline({ optimize: true })` o una lista propia):

- `remove-degenerate`: figuras que no pintan nada (radio 0, texto vacío…).
- `remove-off-canvas`: figuras completamente fuera del lienzo.
- `remove-occluded`: figuras completamente tapadas por un rectángulo opaco
  dibujado después (con 1px de margen para su borde suavizado).

Ninguno quita una figura a la que se ancla una conexión. El contrato es
**equivalencia visual exacta**: `services/compiler/tests/optimizerEquivalence.test.ts`
rasteriza con sharp ambas versiones y exige píxeles idénticos. Por eso se
descartó "eliminar duplicados": dibujar dos veces la misma figura
suavizada oscurece su borde, así que quitar una copia sí se nota
(se midieron 815 píxeles distintos en una conexión duplicada).

Las exportaciones y `/stages` usan el optimizador; `/compile` no (su
salida no cambia).

## Sanitización

`SvgSanitizer` (lista blanca de elementos, atributos y formato de
valores) se aplica a todo SVG antes de exportarlo como SVG o PNG. El
generador ya escapa el texto del usuario; esto es defensa en
profundidad: un archivo exportado nunca puede llevar scripts, manejadores
de eventos, referencias externas ni elementos ajenos.
