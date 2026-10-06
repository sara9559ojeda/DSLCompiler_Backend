# Seguridad

Resumen consolidado — cada decisión ya está documentada donde se tomó
(READMEs de cada paquete, ADRs); esta página junta todo en un solo lugar.

## Superficie pública

**En `docker-compose.yml`** (local): solo dos servicios tienen un puerto
publicado — **gateway** (`:4000`) y **web** (`:8080`). `compiler`,
`projects`, `ai-assist` y `postgres` viven exclusivamente en la red
interna de Docker (`internal`) — no son alcanzables desde fuera del host.

**En Render** (`render.yaml`): los 5 servicios de aplicación son
públicos (`type: web`) — el plan de Render usado no soporta Private
Services. Esto es un cambio de topología de red, no de modelo de
confianza: `projects` nunca confió en la red para estar seguro (ver
[ADR 0007](adr/0007-public-services-with-self-verified-auth.md)), así que
sigue siendo seguro alcanzable directamente. `compiler` y `ai-assist` no
manejan datos de usuario, así que exponerlos no agrega riesgo equivalente
— sí pierden el rate limiting del gateway si alguien les pega directo
(ver "Rate limiting y CORS" abajo).

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
- JWT emitido por el Projects service (`JwtTokenService`, standalone, sin
  depender de Fastify) y **verificado dos veces**: una vez en el gateway
  (`fastify.authenticate`, `@fastify/jwt`, rechazo rápido en el borde) y
  otra vez en `projects` (`ITokenService.verify()`, mismo `JWT_SECRET`) —
  `projects` nunca confía en un header, siempre verifica el
  `Authorization: Bearer <token>` que recibe. Ver
  [ADR 0007](adr/0007-public-services-with-self-verified-auth.md) (y
  [ADR 0004](adr/0004-trusted-header-auth-between-gateway-and-services.md)
  para el diseño original de un solo punto de verificación, descartado al
  no tener Private Services disponibles en Render).
- `JWT_SECRET` debe ser el mismo valor en `apps/gateway` y
  `services/projects` — documentado en ambos `.env.example`.

## Validación de entrada

Todo payload se valida por esquema (TypeBox, `@compiler-img/shared`) en
el gateway **antes** de reenviarlo, y otra vez en el servicio interno
como segunda frontera — ver `docs/adr/0001-generic-grammar-with-shape-registry.md`
para el porqué de mantener un solo esquema compartido en vez de
duplicarlo.

## Rate limiting y CORS

`@fastify/rate-limit` en el gateway, configurable por entorno
(`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`). `@fastify/cors` con
`CORS_ORIGIN` configurable — en desarrollo `*`, en producción debe
restringirse al origen real del frontend. En Render, como `compiler`,
`projects` y `ai-assist` también tienen URL pública (ver arriba), alguien
que les pegue directo evita el rate limit del gateway — no pueden leer/
escribir datos ajenos sin un JWT válido (`projects` lo verifica), pero sí
podrían agotar cuota de la API de Anthropic contra `ai-assist` o generar
carga de cómputo contra `compiler`. Mitigarlo (rate limiting propio por
servicio) queda fuera de alcance mientras no sea un problema real — ver
"Consecuencias" en ADR 0007.

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
