# Seguridad

Resumen consolidado — cada decisión ya está documentada donde se tomó
(READMEs de cada paquete, ADRs); esta página junta todo en un solo lugar.

## Superficie pública

Solo dos servicios tienen un puerto publicado en `docker-compose.yml`:
**gateway** (`:4000`) y **web** (`:8080`). `compiler`, `projects`,
`ai-assist` y `postgres` viven exclusivamente en la red interna de Docker
(`internal`) — no son alcanzables desde fuera del host, ni siquiera si
alguien conoce el puerto interno.

## Secrets

- Cada servicio tiene su propio `.env.example` (documentado, sin valores
  reales) y su `.env` real está en `.gitignore` (raíz y todo
  subdirectorio — patrón `.env` / `.env.*` con excepción de
  `.env.example`).
- `docker-compose.yml` lee un único `.env` en la raíz (ver
  `.env.example` de la raíz) para las variables que cruzan servicios
  (`JWT_SECRET`, credenciales de Postgres, `ANTHROPIC_API_KEY`).
- Nunca se commitea una key real. `ANTHROPIC_API_KEY` vacío hace que
  `/suggest` y `/explain-error` fallen con un 500 enmascarado (ver más
  abajo) en vez de exponer el error del SDK.

## Autenticación

- Contraseñas hasheadas con **Argon2** (`Argon2PasswordHasher`), nunca en
  texto plano ni con un hash reversible.
- JWT emitido por el Projects service (`JwtTokenService`, standalone,
  sin depender de Fastify) y verificado **solo por el gateway**
  (`fastify.authenticate`, `@fastify/jwt`). Ver
  [ADR 0004](adr/0004-trusted-header-auth-between-gateway-and-services.md).
  El Projects service confía en el header interno `x-user-id` que el
  gateway agrega después de verificar — como Projects nunca se expone
  públicamente, ese header no puede falsificarse desde fuera.
- `JWT_SECRET` debe ser el mismo valor en `apps/gateway` y
  `services/projects` — documentado en ambos `.env.example`.

## Validación de entrada

Todo payload se valida por esquema (TypeBox, `@compiler-img/shared`) en
el gateway **antes** de reenviarlo, y otra vez en el servicio interno
como segunda frontera — ver `docs/adr/0001-generic-grammar-with-shape-registry.md`
para el porqué de mantener un solo esquema compartido en vez de
duplicarlo.

## Rate limiting y CORS

`@fastify/rate-limit` en el gateway (único punto de entrada), configurable
por entorno (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`). `@fastify/cors`
con `CORS_ORIGIN` configurable — en desarrollo `*`, en producción debe
restringirse al origen real del frontend.

## Manejo de errores

Todas las respuestas de error del gateway y de `ai-assist` tienen la
misma forma `{ error: { message, statusCode } }`. `ai-assist` en
particular enmascara errores 5xx del SDK de Anthropic (que podrían
incluir detalles internos) con un mensaje genérico — ver
`services/ai-assist/src/http/errorHandler.ts`.

## Docker

- Todas las imágenes de servicio corren como un usuario no-root
  (`appuser`).
- Las imágenes de producción (`runtime`) no incluyen TypeScript, Vitest,
  ni el CLI de Prisma — solo lo estrictamente necesario para correr el
  servicio compilado. Ver
  [ADR 0006](adr/0006-docker-multistage-build-strategy.md).

## HTTPS/TLS

Ni el gateway ni nginx (web) terminan TLS por sí mismos — en este
proyecto (local/demo) se accede por HTTP plano. Para un despliegue real,
la recomendación es poner un reverse proxy (Caddy o Traefik, que
gestionan certificados de Let's Encrypt automáticamente) delante de
`gateway` y `web`, terminando TLS ahí y reenviando por HTTP dentro de la
red interna de Docker — no requiere cambios en el código de ninguno de
los servicios.
