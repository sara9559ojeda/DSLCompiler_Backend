# ADR 0013: gRPC en producción — gateway y compilador en el mismo contenedor

## Contexto

ADR 0012 dejó el salto gateway → compilador en gRPC solo dentro de
docker-compose/CI: en Render el proxy público entrega HTTP/1.x al
contenedor y el plan no tiene red privada (Private Services), así que
dos servicios separados no pueden hablar gRPC entre sí. Pero el objetivo
es que el despliegue real use gRPC.

## Decisión

El servicio `compiler-img-gateway` de Render construye la última etapa
del Dockerfile del gateway, `bundled`: gateway + compilador en el mismo
contenedor, como **dos procesos separados** que se comunican por gRPC
sobre `127.0.0.1:50051` (HTTP/2 de punta a punta, sin proxy en medio).
`apps/gateway/bundled/start.mjs` arranca el compilador, espera a que su
servidor gRPC esté escuchando, arranca el gateway con
`COMPILER_TRANSPORT=grpc`, y si cualquiera de los dos muere detiene al
otro para que Render reinicie el contenedor completo.

- El API HTTP propio del compilador queda solo en loopback; el único
  puerto público del contenedor es el del gateway.
- docker-compose sigue usando la etapa `runtime` (gateway solo) con el
  compilador en su propio contenedor, también por gRPC.
- El servicio `compiler-img-compiler` de Render se mantiene (API HTTP
  pública independiente, sin cambios de funcionalidad), pero el gateway ya
  no lo usa.
- El gateway expone qué transporte usa: header `x-compiler-transport` en
  cada respuesta y `compilerTransport` en `/health`.

## Consecuencias

- gRPC real en producción sin costo extra ni otra nube.
- Gateway y compilador escalan juntos (una instancia contiene ambos). Si
  se necesita escalarlos por separado, mover el compilador a Private
  Services o Cloud Run y apuntar `COMPILER_GRPC_ADDRESS` allí: el código
  no cambia.
