# Compilador de Imágenes

Compilador basado en gramática que traduce un DSL propio de figuras a
SVG/PNG (léxico → sintáctico → semántico → generación de código), expuesto
como app web con editor y previsualización en vivo.

Arquitectura completa, stack por capa y decisiones de diseño:
[C:\Users\saram\.claude\plans\indexed-scribbling-meteor.md](C:\Users\saram\.claude\plans\indexed-scribbling-meteor.md)
(propuesta aprobada) y [`docs/`](docs) (gramática formal, ADRs,
[seguridad](docs/security.md), [performance](docs/performance.md),
[despliegue en Render](docs/deploy-render.md)).

## Estado actual — proyecto completo (Fases 1-6)

- ✅ **Fase 1 — Core del compilador** (`packages/shared`, `services/compiler`):
  Lexer, Parser, AST, SemanticAnalyzer, CodeGenerator (SVG) + exportador PNG,
  con suite de tests unitarios/integración.
- ✅ **Fase 2 — API Gateway** (`apps/gateway`): el compiler service ahora se
  expone por HTTP (`POST /compile`, `POST /export`) y el gateway es el único
  punto de entrada público — valida por esquema, aplica rate limiting, CORS,
  autenticación JWT y reenvía a los servicios internos vía un proxy genérico
  configurado por datos (`routes.config.ts`).
- ✅ **Fase 3 — Frontend** (`apps/web`): editor Monaco (con highlighting
  propio del DSL, code-split fuera del bundle inicial) + previsualización en
  vivo + tema claro/oscuro + export SVG/PNG. Compila en un Web Worker en el
  navegador (reutilizando el mismo Lexer/Parser/SemanticAnalyzer/CodeGenerator
  del backend vía `@compiler-img/compiler/browser`), con debounce de 300ms.
- ✅ **Fase 4 — Projects service + PostgreSQL** (`services/projects`):
  registro/login (JWT emitido aquí, verificado solo por el gateway — ver
  [ADR 0004](docs/adr/0004-trusted-header-auth-between-gateway-and-services.md))
  y CRUD de proyectos guardados, aislados por usuario.
- ✅ **Fase 5 — AI-assist** (`services/ai-assist`): `POST /suggest` genera
  DSL desde lenguaje natural y lo **valida contra el compilador real** antes
  de responder, con un reintento automático si el primer intento no compila
  (ver [ADR 0005](docs/adr/0005-grounded-ai-suggestions.md)); `POST
  /explain-error` explica diagnósticos en español. El contexto de gramática
  que recibe el modelo se genera en tiempo de ejecución desde
  `SHAPE_DEFINITIONS` — nunca queda desactualizado.
- ✅ **Fase 6 — Endurecimiento final**: Docker Compose completo (los 6
  servicios, Postgres solo en red interna — ver
  [ADR 0006](docs/adr/0006-docker-multistage-build-strategy.md)), pipeline de
  CI/CD en GitHub Actions (`.github/workflows/ci.yml`: lint → typecheck →
  tests → build de imágenes → e2e sobre el stack compuesto), 5 tests
  Playwright end-to-end corriendo contra el build de producción real, y
  métricas de performance reales documentadas en
  [`docs/performance.md`](docs/performance.md) — **cero interacciones
  clave superaron el piso de 16ms** que expone el navegador (muy por debajo
  del objetivo de 200ms de INP).

**97 tests automatizados** (92 unitarios/integración + 5 e2e) en verde,
todos verificados corriendo de verdad — no solo escritos.

## Estructura

```
packages/shared         Tipos + catálogo de figuras/colores + contratos HTTP (fuente de verdad del DSL)
packages/compiler-core  El compilador en sí (Lexer→Parser→SemanticAnalyzer→CodeGenerator), publicable en npm — sin deps de Node
services/compiler       Servidor HTTP + CLI + exportación PNG (sharp), sobre @saramariaojeda9559/compiler-core
services/projects       Cuentas + proyectos guardados (Fastify + Prisma + PostgreSQL)
services/ai-assist  Sugerencias de DSL y explicación de errores vía Claude (Fastify + SDK de Anthropic)
apps/gateway        Único punto de entrada público: auth, rate limit, validación, proxy
apps/web            Editor + preview + tema + export (React + Vite + Monaco + Web Worker)
docs/                Gramática formal (EBNF), ADRs, seguridad, performance
.github/workflows/  CI: lint, typecheck, tests, build de imágenes, e2e
```

## Desarrollo

```bash
npm install
npm test          # corre los tests de todos los paquetes (usa fakes/repos en memoria, no requiere Postgres)
npm run typecheck
npm run lint
```

### Todo el stack con un comando (recomendado)

```bash
cp .env.example .env   # agrega tu ANTHROPIC_API_KEY si quieres probar /api/ai/*
docker compose up -d --build
```

- Frontend: http://localhost:8080
- Gateway: http://localhost:4000
- `compiler`, `projects`, `ai-assist` y `postgres` solo son alcanzables
  dentro de la red interna de Docker (por diseño — ver
  [docs/security.md](docs/security.md)).

```bash
docker compose down -v   # apaga todo y borra el volumen de Postgres
```

## Desplegar

[`render.yaml`](render.yaml) despliega los 6 servicios + Postgres en
[Render](https://render.com) de un solo golpe, a partir de los mismos
Dockerfiles — paso a paso en
[docs/deploy-render.md](docs/deploy-render.md).

### e2e contra el stack real

```bash
docker compose up -d --build
npm run e2e --workspace=apps/web
```

### Desarrollo activo (sin Docker, un terminal por servicio)

```bash
docker run -d --name compiler-img-postgres \
  -e POSTGRES_USER=compiler_img -e POSTGRES_PASSWORD=compiler_img -e POSTGRES_DB=compiler_img \
  -p 5433:5432 postgres:16-alpine

cd services/projects && cp .env.example .env && npm run prisma:migrate && cd ../..
cd services/ai-assist && cp .env.example .env && cd ../..   # agrega tu ANTHROPIC_API_KEY en .env

npm run start --workspace=services/compiler    # puerto 4001
npm run start --workspace=services/projects    # puerto 4003, usa Postgres
npm run start --workspace=services/ai-assist   # puerto 4004, usa la API de Anthropic
npm run start --workspace=apps/gateway         # puerto 4000, reenvía a 4001/4003/4004
npm run dev --workspace=apps/web               # puerto 5173, usa VITE_GATEWAY_URL
```

Ver los README de cada paquete
([`services/compiler`](services/compiler/README.md),
[`services/projects`](services/projects/README.md),
[`services/ai-assist`](services/ai-assist/README.md),
[`apps/gateway`](apps/gateway/README.md), [`apps/web`](apps/web/README.md))
para más detalle.
