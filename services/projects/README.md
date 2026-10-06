# @compiler-img/projects

Persistencia de cuentas y proyectos guardados. Node.js + Fastify + Prisma +
PostgreSQL. Pensado para alcanzarse a través del
[gateway](../../apps/gateway), pero **nunca asume que es así** — ver
"Autenticación" abajo.

## Rutas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | — | Crea una cuenta, devuelve un JWT |
| POST | `/auth/login` | — | Verifica credenciales, devuelve un JWT |
| GET | `/projects` | JWT | Lista los proyectos del usuario |
| POST | `/projects` | JWT | Crea un proyecto (`name`, `dslSource`) |
| GET | `/projects/:id` | JWT | Obtiene un proyecto propio |
| PUT | `/projects/:id` | JWT | Actualiza `name`/`dslSource` |
| DELETE | `/projects/:id` | JWT | Elimina un proyecto propio |

Las rutas marcadas "JWT" requieren `Authorization: Bearer <token>`.

## Autenticación: verifica el JWT él mismo

Este servicio **verifica el token por su cuenta** (`ITokenService.verify()`,
`JwtTokenService`, mismo `JWT_SECRET` que el gateway) — no confía en ningún
header puesto por otro servicio. El gateway también verifica el JWT antes
de reenviar (rechazo rápido en el borde) y reenvía el `Authorization`
original tal cual; `projects` lo vuelve a verificar de forma
independiente. Es defensa en profundidad a propósito: en
`docker-compose.yml` este servicio vive en la red interna sin puerto
público, pero en despliegues donde eso no es posible (ver
[docs/deploy-render.md](../../docs/deploy-render.md)) sigue siendo seguro
alcanzarlo directamente — ver
[ADR 0007](../../docs/adr/0007-public-services-with-self-verified-auth.md).

## Desarrollo

Requiere una base de datos PostgreSQL. Para levantar una dedicada a este
proyecto (sin tocar ninguna otra):

```bash
docker run -d --name compiler-img-postgres \
  -e POSTGRES_USER=compiler_img -e POSTGRES_PASSWORD=compiler_img -e POSTGRES_DB=compiler_img \
  -p 5433:5432 postgres:16-alpine
```

```bash
cp .env.example .env   # DATABASE_URL ya apunta a localhost:5433 por defecto
npm install
npm run prisma:migrate   # crea las tablas (users, projects)
npm test                 # corre contra repositorios en memoria — no toca Postgres
npm start                 # sirve en :4003, esta sí usa Postgres de verdad
```

## Diseño para testabilidad (DIP)

`buildServer({ userRepository, projectRepository, passwordHasher, tokenService })`
acepta cada dependencia inyectada. En producción son las implementaciones
reales (`PrismaUserRepository`, `PrismaProjectRepository`,
`Argon2PasswordHasher`, `JwtTokenService`); los tests (`tests/*.test.ts`)
usan fakes en memoria (`tests/fakes/`) — la suite completa corre sin una
base de datos real.
