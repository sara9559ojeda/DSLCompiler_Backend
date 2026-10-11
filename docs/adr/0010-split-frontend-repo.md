# ADR 0010: Separar el frontend en su propio repositorio

## Contexto

[ADR 0008](0008-extract-compiler-core-package.md) y
[ADR 0009](0009-merge-shared-registry-into-compiler-core.md) prepararon
`packages/compiler-core` para ser instalable fuera de este monorepo,
publicándolo en npm como `@saramariaojeda9559/compiler-core`. Con eso resuelto,
`apps/web` ya no tiene ninguna razón técnica para seguir viviendo en el
mismo repositorio que el backend — y el proyecto necesita dos
repositorios de GitHub distintos, cada uno desplegable por separado.

## Decisión

El historial de commits se dividió por carpeta con `git filter-repo`, en
vez de empezar de cero en el repo nuevo:

- Este repositorio (`DSLCompiler_Backend`) conserva todo lo que no es
  `apps/web`: `apps/gateway`, `services/*`, `packages/shared`,
  `packages/compiler-core` (el código fuente del paquete — además de
  estar publicado en npm, los servicios de este repo lo siguen
  consumiendo como workspace local), Docker Compose, `render.yaml`, docs y
  CI. Los commits que solo tocaban `apps/web` se podaron automáticamente
  (quedaron vacíos al quitar esa carpeta).
- El repositorio del frontend (`DSLCompiler`, el que ya existía) se
  reescribió para quedarse solo con el contenido de `apps/web`, movido a
  la raíz. Pasa a depender de `@saramariaojeda9559/compiler-core` como una
  dependencia de npm normal (versión publicada), no como paquete de
  workspace.

`docker-compose.yml` y `render.yaml` de este repo ya no incluyen un
servicio `web` — el frontend se construye y despliega desde su propio
repositorio, apuntando su `GATEWAY_URL`/`VITE_GATEWAY_URL` a la URL
pública de `compiler-img-gateway`. La suite e2e con Playwright, que
corría contra el stack completo, se queda en el repo del frontend; el CI
de este repo la reemplaza por un smoke test con `curl` contra
`POST /api/compile` a través del gateway ya compuesto con Docker.

## Consecuencias

- Cada repo se despliega, versiona y tiene su propio pipeline de CI de
  forma independiente — el objetivo original de "capas desacopladas y
  desplegables por separado" del plan de arquitectura, llevado también al
  nivel de control de versiones.
- Un cambio en la gramática/semántica del DSL sigue necesitando un solo
  cambio de fuente de verdad (`packages/compiler-core`, en este repo),
  pero ahora requiere publicar una nueva versión en npm y actualizarla en
  el repo del frontend — el trade-off aceptado por desacoplar los
  despliegues.
- El historial de Git de cada repo es genuino (son los mismos commits que
  ya existían, filtrados por carpeta), no commits inventados para cumplir
  un número — ver también [ADR 0008](0008-extract-compiler-core-package.md).
