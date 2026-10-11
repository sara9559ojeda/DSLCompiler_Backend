# ADR 0007: Servicios públicos en Render + verificación de JWT propia en `projects`

> **Nota:** la decisión de verificar el JWT en `projects` sigue vigente.
> El supuesto de que el gateway podía llamar a los servicios internos por
> un hostname bare quedó invalidado al probarlo de verdad — ver
> [ADR 0011](0011-gateway-calls-upstreams-by-public-url.md).

## Contexto

[ADR 0004](0004-trusted-header-auth-between-gateway-and-services.md) asumía
que `compiler`, `projects` y `ai-assist` solo serían alcanzables a través
del gateway (`type: pserv` en Render, red interna de Docker en local), y
que por eso `projects` podía confiar ciegamente en el header `x-user-id`
que el gateway agregaba tras verificar el JWT.

Al desplegar en Render, la cuenta usada no tiene disponible la feature de
**Private Services** en su plan de workspace actual (error: *"service type
is not available for this plan"* al crear `compiler-img-compiler` y
`compiler-img-ai-assist`). Private Services es un feature de plan, no de
instancia — no se resuelve cambiando el `plan:` de `free` a algo más caro
dentro del mismo tipo de servicio.

## Decisión

Los 5 servicios pasan a `type: web` (públicamente alcanzables) en
`render.yaml`. Para no reabrir el agujero que ADR 0004 evitaba
deliberadamente:

- **`projects` verifica el JWT por sí mismo** (`ITokenService.verify()`,
  `JwtTokenService` con `jsonwebtoken`) en vez de confiar en un header. Lee
  `Authorization: Bearer <token>`, lo verifica con el mismo `JWT_SECRET`
  que usa el gateway, y usa el `sub` del payload verificado como id de
  usuario. Si el header falta o el token no es válido, `401` — sin
  excepciones, sin header de respaldo.
- El gateway sigue verificando el JWT también (`fastify.authenticate`,
  rechazo rápido en el borde) y ahora **reenvía el header `Authorization`
  original** al upstream en vez de agregar `x-user-id` — así `projects`
  tiene qué verificar. Es verificación doble a propósito (defensa en
  profundidad): el gateway rechaza rápido lo obviamente inválido: un
  request directo a `projects` (sin pasar por el gateway) sigue siendo
  seguro porque `projects` nunca confía en nada que no haya verificado él
  mismo.
- `compiler` y `ai-assist` quedan públicos sin cambios adicionales — no
  manejan datos de usuario ni tienen rutas con efectos por-usuario, así
  que no hay un equivalente a proteger.

## Consecuencias

- `x-user-id` y el `USER_ID_HEADER` compartido desaparecen del código
  (`packages/shared`, `apps/gateway`, `services/projects`) — ya no hay un
  único punto de verificación, hay dos independientes.
- `docker-compose.yml` no cambia de topología (`projects` sigue sin
  `ports:` público, solo red interna) pero el código ahora es seguro
  también si alguna vez se expone — la verificación ya no depende de la
  topología de red para ser correcta.
- Rate limiting sigue existiendo solo en el gateway — alguien que le
  pegue directo a `compiler-img-projects.onrender.com` evita ese rate
  limit (aunque no puede leer/escribir datos de otro usuario sin un JWT
  válido). Mitigación de abuso por volumen en los servicios internos
  queda fuera de alcance de este ADR; si se vuelve un problema real, cada
  servicio podría registrar su propio `@fastify/rate-limit`.
- `docs/security.md` y `docs/deploy-render.md` se actualizaron para
  reflejar que todos los servicios tienen URL pública en este despliegue.
