# ADR 0011: El gateway llama a los servicios internos por su URL pública

## Contexto

[ADR 0007](0007-public-services-with-self-verified-auth.md) asumía,
basado en la documentación de Render, que un servicio `type: web` expone
un hostname interno bare (igual a su `name:`) alcanzable desde otros
servicios de la misma cuenta — y `render.yaml` usaba
`http://compiler-img-compiler:4001` como `COMPILER_SERVICE_URL`.

Al desplegar de verdad (Blueprint nuevo, desde `DSLCompiler_Backend`) y
probar `POST /api/compile` contra el gateway real, la respuesta fue
`{"error":{"message":"fetch failed","statusCode":500}}` — de forma
consistente, no un cold-start (se reintentó 5 veces). Se verificó:

- `compiler-img-compiler`, `compiler-img-projects` y
  `compiler-img-ai-assist` responden `200 {"status":"ok"}` en `/health`
  por su propia URL pública — los tres servicios están sanos.
- `COMPILER_SERVICE_URL` en el dashboard de `compiler-img-gateway` tenía
  exactamente el valor esperado (`http://compiler-img-compiler:4001`).

Con el valor correcto confirmado y los upstreams sanos, la única
explicación que queda es que el hostname interno bare simplemente no
resuelve entre estos servicios en este plan — contrario a lo que asumía
ADR 0007.

## Decisión

El gateway llama a los tres servicios por su URL pública HTTPS
(`https://compiler-img-compiler.onrender.com`, etc.) en vez del hostname
interno. Mismo mecanismo de configuración (`render.yaml`, variables de
entorno) — solo cambia el valor.

## Consecuencias

- Cada llamada gateway → servicio interno ahora sale a internet y vuelve
  a entrar (un hop extra de latencia/ida-vuelta por el edge de Render),
  en vez de quedarse en red privada. Aceptable para este proyecto; si en
  el futuro la cuenta tiene Private Services disponibles, volver a
  `pserv` + hostname interno eliminaría ese hop.
- No se abre superficie de ataque nueva: estos tres servicios ya eran
  públicamente alcanzables desde ADR 0007 (por la limitación de plan),
  esto solo cambia *cómo los llama el gateway*, no quién puede llamarlos.
- Igual que `GATEWAY_URL`/`CORS_ORIGIN`, estos tres valores asumen que el
  nombre del servicio no chocó con otra cuenta de Render — si alguna vez
  no coincide, corregir a mano en el dashboard igual que esos dos.
