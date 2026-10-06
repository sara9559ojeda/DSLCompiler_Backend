# @compiler-img/gateway

Punto de entrada público del sistema para el frontend. Valida y limita las
peticiones externas y las reenvía a los servicios internos (`compiler`,
`projects`, `ai-assist`) con un esquema compartido. En `docker-compose.yml`
esos tres servicios además viven en una red interna sin puerto expuesto; en
despliegues donde eso no es posible (ver
[docs/deploy-render.md](../../docs/deploy-render.md)), `projects` sigue
siendo seguro porque verifica el JWT él mismo — ver
[ADR 0007](../../docs/adr/0007-public-services-with-self-verified-auth.md).

## Responsabilidades

- **Validación de esquema** (TypeBox, compartido con los servicios internos vía
  `@compiler-img/shared`) antes de reenviar cualquier payload.
- **Rate limiting** (`@fastify/rate-limit`), configurable por entorno.
- **CORS** (`@fastify/cors`).
- **Autenticación JWT** (`@fastify/jwt`): `fastify.authenticate` verifica el
  token y rechaza rápido en el borde las rutas con `requiresAuth: true`
  (todo `/api/projects*`). El header `Authorization` original se reenvía
  tal cual al upstream — `projects` lo vuelve a verificar de forma
  independiente (defensa en profundidad, no un passthrough de confianza).
  Las rutas de compilar/exportar/IA siguen siendo anónimas a propósito (no
  persisten nada por usuario).
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
