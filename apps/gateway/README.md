# @compiler-img/gateway

Único punto de entrada público del sistema. Valida y limita las peticiones
externas y las reenvía a los servicios internos (`compiler`, `projects`, y a
futuro `ai-assist`) — ninguno de esos servicios se expone directamente.

## Responsabilidades

- **Validación de esquema** (TypeBox, compartido con los servicios internos vía
  `@compiler-img/shared`) antes de reenviar cualquier payload.
- **Rate limiting** (`@fastify/rate-limit`), configurable por entorno.
- **CORS** (`@fastify/cors`).
- **Autenticación JWT** (`@fastify/jwt`): `fastify.authenticate` verifica el
  token y, en las rutas con `requiresAuth: true` (todo `/api/projects*`), el
  gateway agrega el header interno de confianza `x-user-id` con el id ya
  verificado antes de reenviar — el Projects service nunca vuelve a verificar
  el JWT, solo confía en ese header (solo el gateway puede alcanzarlo). Las
  rutas de compilar/exportar siguen siendo anónimas a propósito (no
  persisten nada).
- **Proxy genérico** con soporte de parámetros de ruta (`:id`): las rutas
  públicas viven en `src/routes/routes.config.ts` (método, path público,
  path upstream —con los mismos `:param`—, servicio destino, si requiere
  auth, esquema del body). Agregar una ruta nueva —incluso hacia un servicio
  nuevo— es agregar una entrada ahí; `registerProxyRoutes.ts` no cambia.
- **Formato de error centralizado**: toda respuesta de error (404, 400 de
  validación, 401, 500, ...) tiene la forma `{ error: { message, statusCode } }`.

## Desarrollo

```bash
cp .env.example .env
npm install
npm test
npm start   # requiere compiler service y projects service corriendo
```

## Diseño para testabilidad (DIP)

`buildServer({ upstreamClient })` acepta una implementación de
`IUpstreamClient` inyectada. En producción es `FetchUpstreamClient` (HTTP
real); en los tests de integración (`tests/gateway.test.ts`) es un
`FakeUpstreamClient` que no requiere levantar el compiler service.
