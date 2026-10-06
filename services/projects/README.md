# @compiler-img/projects

Persistencia de cuentas y proyectos guardados. Node.js + Fastify + Prisma +
PostgreSQL. Solo alcanzable a través del [gateway](../../apps/gateway) — en
`docker-compose` vive en la red interna, sin puerto público.

## Rutas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | — | Crea una cuenta, devuelve un JWT |
| POST | `/auth/login` | — | Verifica credenciales, devuelve un JWT |
| GET | `/projects` | `x-user-id` | Lista los proyectos del usuario |
| POST | `/projects` | `x-user-id` | Crea un proyecto (`name`, `dslSource`) |
| GET | `/projects/:id` | `x-user-id` | Obtiene un proyecto propio |
| PUT | `/projects/:id` | `x-user-id` | Actualiza `name`/`dslSource` |
| DELETE | `/projects/:id` | `x-user-id` | Elimina un proyecto propio |

## Por qué no verifica el JWT él mismo

El gateway ya verifica el token (`@fastify/jwt`) antes de reenviar cualquier
request hacia aquí, y agrega el header interno `x-user-id` con el id ya
verificado (ver `apps/gateway/src/routes/registerProxyRoutes.ts`). Este
servicio solo confía en ese header — nunca se expone públicamente, así que
nada más puede alcanzarlo sin pasar primero por esa verificación. Esto
evita duplicar la lógica de JWT en dos servicios (`USER_ID_HEADER` está
centralizado en `@compiler-img/shared` para que ambos lados usen
exactamente el mismo nombre de header).

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
