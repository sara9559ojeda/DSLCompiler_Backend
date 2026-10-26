# ADR 0012: gRPC (contract-first) entre el gateway y el compilador

## Contexto

La comunicación gateway → compilador era HTTP/JSON sin contrato formal
más allá de los esquemas TypeBox. Se pidió una arquitectura gRPC con
contratos versionados en Protocol Buffers, sin meter dependencias de gRPC
en las clases de dominio y sin romper el API público que usa el frontend.

## Decisión

- **Contratos** en `packages/grpc-contracts/proto`, versionados por
  paquete (`compiler.v1`, `export.v1`):
  - `CompilerService`: `Compile`, `Analyze`, `GetCompilationStages`.
  - `ExportService`: `Export`, `GetSupportedFormats`.
  Los cambios incompatibles van a un `v2`; en `v1` solo se agregan campos.
- **Código tipado generado** con `proto-loader-gen-types`
  (`npm run proto:generate`), versionado en git. CI lo regenera
  (`npm run proto:check`) y falla si difiere de lo commiteado.
- **Hexagonal**: `compiler-core` (dominio) no sabe nada de gRPC ni de
  HTTP. `services/compiler/src/application/CompilerApplication.ts` tiene
  los casos de uso; `src/http/server.ts` y `src/grpc/server.ts` son dos
  adaptadores delgados sobre la misma instancia.
- **Gateway**: `GrpcCompilerUpstreamClient` implementa el mismo puerto
  `IUpstreamClient` que el cliente fetch y devuelve respuestas con la
  forma exacta del API HTTP, así que `/api/*` y el frontend no cambian.
  `TargetRoutingUpstreamClient` elige transporte por servicio destino.
- **Límites**: deadline por llamada (`GRPC_DEADLINE_MS`, 5 s por defecto),
  mensajes de 4 MiB de entrada / 16 MiB de salida, y `source` limitado a
  `MAX_SOURCE_LENGTH` (también en el esquema HTTP). Los errores del DSL
  son respuestas normales (`success=false` + diagnósticos); los códigos
  gRPC se reservan para fallas de la llamada y se traducen a HTTP
  (`INVALID_ARGUMENT`→400, `UNAVAILABLE`→503, `DEADLINE_EXCEEDED`→504).

## Dónde corre gRPC

gRPC necesita HTTP/2 de punta a punta. El proxy público de Render
entrega HTTP/1.x al contenedor, así que gRPC **no** funciona a través de
las URLs públicas `*.onrender.com`; solo funciona por red privada (Private
Services), que este plan no tiene (ver ADR 0011). Referencias:

- https://community.render.com/t/grpc-working-on-render/7389
- https://community.render.com/t/unexpected-http-1-x-request/7359
- https://community.render.com/t/internal-grpc-services/14545

Por eso:

- **docker-compose y CI**: `COMPILER_TRANSPORT=grpc` — el gateway habla
  gRPC con el compilador en la red interna, y el job e2e de CI lo prueba.
- **Render (producción actual)**: `COMPILER_TRANSPORT` queda en `http`
  (valor por defecto) y el compilador corre con `GRPC_ENABLED=false`.

Para tener gRPC también en producción hay que cambiar *dónde* corre, no
el código: Private Services en Render (plan pago) o Cloud Run (soporta
HTTP/2 de punta a punta). En ambos casos basta con
`COMPILER_TRANSPORT=grpc` y `COMPILER_GRPC_ADDRESS` en el gateway.

## Consecuencias

- Un contrato único y tipado para ambos lados; un cambio en el `.proto`
  rompe el typecheck del servidor y del cliente a la vez.
- Dos transportes que mantener, pero sin lógica duplicada: los dos
  adaptadores delegan en `CompilerApplication`, y los tests del gateway
  verifican que ambos transportes devuelvan exactamente la misma forma.
