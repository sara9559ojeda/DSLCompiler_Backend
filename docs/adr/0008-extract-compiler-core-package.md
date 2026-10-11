# ADR 0008: Extraer `packages/compiler-core` como paquete publicable

## Contexto

Separar el frontend y el backend en repositorios de GitHub distintos
(decisión del equipo) significa que `apps/web` ya no puede importar
`services/compiler` vía workspace de npm local — necesita una dependencia
real, instalable. `services/compiler` además arrastra `sharp` (exportación
PNG, binario nativo) y `fastify` (servidor HTTP) como dependencias de
producción: publicar ese paquete tal cual a npm obligaría al navegador a
descargar (aunque nunca ejecute) un addon nativo de Node.

El subpath `@compiler-img/compiler/browser` (ver
[ADR 0003](0003-shape-renderer-and-exporter-abstractions.md), introducido
en la Fase 3) ya definía exactamente este límite — qué es seguro para el
navegador y qué no — pero vivía *dentro* de `services/compiler`, no como
un paquete independiente.

## Decisión

Todo lo que `browser.ts` re-exportaba (Lexer, Parser, AST, SemanticAnalyzer,
CodeGenerator, Scene, CompilerPipeline, config de canvas/colores) se mueve
a un paquete nuevo, `packages/compiler-core`, con una sola dependencia
(`@compiler-img/shared`) y cero código Node-específico. Ese paquete es el
que se publica en npm y el que instala el repo del frontend.

`services/compiler` pasa a depender de `@saramariaojeda9559/compiler-core` (vía
workspace, igual que antes) y queda reducido a lo que de verdad es
específico de Node: el servidor Fastify (`http/`), el CLI, y la
exportación a PNG (`export/PngExporter.ts`, `sharp`). `services/ai-assist`
—que solo necesitaba el compilador para validar el DSL que genera la
IA— pasa a depender de `compiler-core` directo, sin arrastrar `services/
compiler` (ni `sharp`) a su imagen Docker.

## Consecuencias

- `@compiler-img/compiler/browser` desaparece — ya no hace falta un
  subpath especial, porque `compiler-core` *es* el paquete browser-safe.
- La imagen Docker de `ai-assist` se achica (ya no construye ni copia
  `services/compiler`).
- `apps/web` importa `@saramariaojeda9559/compiler-core` igual que cualquier
  dependencia de npm — el import no cambia cuando ese paquete pase de
  "workspace local" a "versión publicada" al mudarse de repo.
- Un cambio en la gramática/semántica del DSL ahora toca un solo paquete
  (`compiler-core`), consumido igual por el navegador, por
  `services/compiler` y por `services/ai-assist` — sigue habiendo una sola
  fuente de verdad del compilador, solo que ahora es un paquete explícito
  en vez de un subpath de otro servicio.
