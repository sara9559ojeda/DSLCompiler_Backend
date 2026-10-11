# Desplegar en Render

Usa [`render.yaml`](../render.yaml) (un "Blueprint" de Render) para crear
los 4 servicios de backend + la base de datos de un solo golpe, a partir de
los mismos Dockerfiles que ya usa `docker-compose.yml` — no hay nada nuevo
que mantener. El frontend (`apps/web`) vive en su propio repositorio y se
despliega por separado — ver su propia guía de despliegue en ese repo.

## 1. Pushear el repo a GitHub

Render despliega desde un repositorio Git (GitHub o GitLab). Si todavía no
existe el remoto:

```bash
git add -A
git commit -m "Initial commit"
gh repo create <tu-usuario>/compiler-img --private --source=. --push
```

(o crea el repo a mano en GitHub y `git remote add origin <url> && git push -u origin main`).

## 2. Crear el Blueprint en Render

1. En el dashboard de Render: **New > Blueprint**.
2. Elegí el repositorio que acabás de pushear. Render detecta `render.yaml`
   automáticamente.
3. Te va a pedir valores para las variables marcadas `sync: false` en
   `render.yaml`:
   - `compiler-img-ai-assist` → `ANTHROPIC_API_KEY`: tu API key real (o
     dejala vacía por ahora — `/api/ai/*` va a responder con un 500
     enmascarado hasta que la cargues, el resto del sistema funciona igual).
   - `compiler-img-gateway` → `CORS_ORIGIN`: poné un placeholder por ahora
     (ver paso 4), por ejemplo la URL del deploy de Render del repo del
     frontend.
4. Confirmá — Render crea la base de datos primero, después construye y
   levanta los 4 servicios.

## 3. Corregir las dos URLs placeholder (paso obligatorio)

Render no sabe la URL pública real de un servicio hasta que lo crea, así
que el placeholder del paso 3 es una suposición inicial. Una vez que el
primer deploy termina:

1. Abrí **compiler-img-gateway** en el dashboard → copiá su URL pública
   real (arriba del todo de la página del servicio). Esa es la URL que el
   repo del frontend necesita como `GATEWAY_URL`.
2. Una vez que el frontend esté desplegado y tengas su URL pública real,
   volvé a **compiler-img-gateway** → **Environment** → actualizá
   `CORS_ORIGIN` con esa URL.
3. Cada cambio de variable dispara un redeploy automático de ese servicio.

## 4. Verificar

```bash
curl https://<tu-gateway>.onrender.com/health
curl -X POST https://<tu-gateway>.onrender.com/api/compile \
  -H "Content-Type: application/json" \
  -d '{"source":"c1 = crear_circulo(radio=50, color=rojo, x=100, y=100);"}'
```

## Qué es privado y qué es público

A diferencia de `docker-compose.yml` (donde `compiler`/`projects`/
`ai-assist` solo viven en la red interna de Docker), en Render **los 4
servicios son `type: web`** — el plan de Render de esta cuenta no incluye
Private Services (`type: pserv` falla con *"service type is not available
for this plan"* al crear el Blueprint; si tu cuenta sí lo soporta, podés
volver a `pserv` para esos tres).

Esto es seguro porque `projects` **verifica el JWT por sí mismo**
(`Authorization: Bearer <token>`, no confía en ningún header) en vez de
asumir que solo el gateway puede alcanzarlo — ver
[ADR 0007](adr/0007-public-services-with-self-verified-auth.md). `compiler`
y `ai-assist` no manejan datos de usuario, así que ser públicos no abre un
agujero equivalente (sí quedan sin el rate limiting del gateway si alguien
les pega directo — ver [docs/security.md](security.md)).

El gateway llama a `compiler`/`projects`/`ai-assist` por su **URL pública
HTTPS** (`https://<name>.onrender.com`), no por un hostname interno — ver
[ADR 0011](adr/0011-gateway-calls-upstreams-by-public-url.md) (el
hostname interno bare que documenta Render no resolvió en la práctica
para `type: web` en este plan). Si algo no conecta entre servicios, antes
de tocar el código revisá que `COMPILER_SERVICE_URL` /
`PROJECTS_SERVICE_URL` / `AI_SERVICE_URL` en `compiler-img-gateway`
coincidan con la URL pública real de cada servicio (visible arriba de su
propia página en el dashboard).

## Antes de confirmar el Blueprint

`render.yaml` pone `plan: free` en los 4 servicios y en la base de datos.
Los límites del plan gratuito de Render (cuántos servicios free simultáneos
permite una cuenta, cuotas de horas/mes, etc.) cambian con el tiempo y
dependen de tu cuenta — revisá el dashboard de Render antes de confirmar
el Blueprint. Si no te deja crear los 4 como `free`, subí el `plan:` de
los que haga falta (p. ej. `starter`) directamente en `render.yaml` antes
de pushear, o cambialo luego por servicio en el dashboard.

## Plan gratuito: limitaciones a tener en cuenta

- Los servicios free de Render "duermen" tras un período de inactividad —
  la primera request después de eso tarda más (cold start) mientras
  arranca el contenedor de nuevo. Normal, no es un bug.
- La base de datos Postgres free de Render expira después de un tiempo
  (Render te avisa por email) — si eso pasa para tu sustentación, creá una
  nueva y corré `prisma migrate deploy` apuntando a la nueva
  `DATABASE_URL` (Render ya te la actualiza sola si usás `fromDatabase`
  como está configurado en `render.yaml`).
- Si necesitás que `compiler-img-ai-assist` responda de verdad, cargá una
  `ANTHROPIC_API_KEY` real en su pestaña **Environment** — nunca la
  pongas en `render.yaml` ni la commitees.
