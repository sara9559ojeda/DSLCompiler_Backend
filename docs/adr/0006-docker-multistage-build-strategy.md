# ADR 0006: Estrategia de build multi-stage para Docker

## Contexto

El proyecto es un monorepo con 4 servicios Node desplegables (compiler,
projects, ai-assist, gateway) más un frontend estático (web), todos
dependiendo de `packages/shared`. Cada uno necesita su propia imagen,
liviana, sin herramientas de desarrollo (TypeScript, Vitest, Prisma CLI)
en producción.

## Decisión

Cada `Dockerfile` usa 4 stages, con el **contexto de build siempre en la
raíz del monorepo** (no en la carpeta del servicio) para poder copiar
`packages/shared` y el `package-lock.json` compartido:

1. `deps`: copia solo los `package.json` de cada workspace + el lockfile,
   `npm ci` (con devDependencies — se cachea mientras esos archivos no
   cambien, independientemente del código fuente).
2. `build`: hereda de `deps`, copia el código fuente real, compila
   (`tsc`, y para `projects` también `prisma generate`).
3. `prod-deps`: una imagen nueva, mismos `package.json`,
   `npm ci --omit=dev` — `node_modules` liviano, sin TypeScript/Vitest/
   Prisma CLI.
4. `runtime`: copia `node_modules` de `prod-deps` + el `dist/` compilado
   de `build`, corre como usuario no-root.

`apps/web` no tiene `runtime` en Node: el stage final es `nginx:alpine`
sirviendo los estáticos de `vite build`.

## Problemas reales encontrados (y por qué el Dockerfile se ve así)

- **`tsconfig.base.json` faltante**: cada workspace lo referencia via
  `extends`; había que copiarlo explícitamente en `deps` (no basta con
  copiar el `package.json` de cada paquete).
- **Prisma + Debian**: el motor de Prisma necesita OpenSSL, que
  `node:20-slim` no trae — sin `apt-get install openssl`, tanto
  `prisma generate` como `prisma migrate deploy` fallan en tiempo de
  ejecución con un error de detección de libssl.
- **`prisma generate` vs. `prod-deps`**: el cliente generado
  (`node_modules/.prisma/client`) se produce contra el `node_modules` de
  `deps`/`build`, pero `runtime` copia su `node_modules` de `prod-deps`
  (una instalación *separada*, sin ese directorio generado). Sin copiar
  `node_modules/.prisma` desde `build` por encima, `@prisma/client` lanza
  `"did not initialize yet"` al arrancar. Es un problema conocido de
  Prisma en builds multi-stage, no específico de este proyecto.
- **Migraciones**: `runtime` deliberadamente no lleva el CLI de Prisma
  (es una devDependency). En vez de instalarlo solo para eso,
  `docker-compose.yml` define un servicio `projects-migrate` que usa
  `target: build` del mismo Dockerfile (que sí tiene el CLI) y corre
  `prisma migrate deploy` una sola vez, antes de que `projects` arranque
  (`depends_on: { condition: service_completed_successfully }`).

## Consecuencias

- Cinco imágenes de producción sin herramientas de build ni CLIs
  innecesarios.
- Los tres problemas de arriba (tsconfig, OpenSSL, `.prisma` client) son
  el tipo de fricción que solo aparece al construir la imagen de verdad —
  se descubrieron y corrigieron ejecutando `docker compose build` y
  `docker compose up` contra un Postgres real, no asumiendo que el
  Dockerfile funcionaría por inspección.
