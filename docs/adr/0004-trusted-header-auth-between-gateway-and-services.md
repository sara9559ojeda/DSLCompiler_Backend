# ADR 0004: Autenticación de un solo punto — el gateway verifica, los servicios internos confían

> **Superseded por [ADR 0007](0007-public-services-with-self-verified-auth.md).**
> El despliegue real terminó sin Private Services disponibles en el plan de
> Render de la cuenta usada, así que `projects` pasó a verificar el JWT por
> sí mismo en vez de confiar en `x-user-id`. Esta decisión queda como
> registro histórico de por qué el diseño original era así.

## Contexto

El Projects service necesita saber qué usuario hace cada petición para
aislar sus proyectos. El gateway ya tiene `@fastify/jwt` registrado y
`fastify.authenticate` probado desde la Fase 2. La pregunta es dónde vive
la verificación del JWT: ¿en cada servicio interno, o solo en el gateway?

## Decisión

Solo el gateway verifica el JWT. Las rutas de `routes.config.ts` marcadas
`requiresAuth: true` pasan primero por `fastify.authenticate`; una vez
verificado, el gateway agrega el header interno `x-user-id` (constante
`USER_ID_HEADER`, centralizada en `@compiler-img/shared`) con el id del
usuario antes de reenviar la petición. El Projects service nunca ve el
JWT — solo lee `x-user-id` y falla cerrado (401) si no está presente.

Esto es seguro porque el gateway es el único punto de entrada público
(ver el diagrama de arquitectura): en `docker-compose`/producción, el
Projects service vive en la red interna sin puerto expuesto, así que nada
externo puede alcanzarlo para falsificar ese header.

## Alternativa considerada

Verificar el JWT también en el Projects service (defensa en profundidad).
Se descartó para esta fase: duplica la dependencia de `@fastify/jwt` y el
`JWT_SECRET` en dos servicios sin agregar protección real mientras la
topología de red (gateway como único punto público) se mantenga. Queda
como mejora de endurecimiento (Fase 6) si el equipo decide no confiar
únicamente en el aislamiento de red.

## Consecuencias

- `IUpstreamClient.forward()` en el gateway acepta `headers` — el único
  header que el gateway agrega por sí mismo (nunca reenvía headers del
  cliente sin más) es `x-user-id`, y solo en rutas `requiresAuth: true`.
- `JwtTokenService` (Projects service) firma tokens de forma independiente
  de Fastify (usa `jsonwebtoken` directamente), así que emitir un token en
  `/auth/register`/`/auth/login` no requiere que ese servicio verifique
  nada — separa limpiamente "emitir" (Projects) de "verificar" (gateway).
