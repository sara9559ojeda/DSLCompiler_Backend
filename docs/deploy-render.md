# Desplegar en Render

Usa [`render.yaml`](../render.yaml) (un "Blueprint" de Render) para crear
los 6 servicios + la base de datos de un solo golpe, a partir de los mismos
Dockerfiles que ya usa `docker-compose.yml` — no hay nada nuevo que
mantener.

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
     (ver paso 4), por ejemplo `https://compiler-img-web.onrender.com`.
   - `compiler-img-web` → `GATEWAY_URL`: mismo caso, poné
     `https://compiler-img-gateway.onrender.com` como placeholder.
4. Confirmá — Render crea la base de datos primero, después construye y
   levanta los 5 servicios.

## 3. Corregir las dos URLs placeholder (paso obligatorio)

Render no sabe la URL pública real de un servicio hasta que lo crea, así
que las dos variables del paso 3 son una suposición inicial basada en la
convención `https://<nombre-del-servicio>.onrender.com`. Una vez que el
primer deploy termina:

1. Abrí **compiler-img-gateway** en el dashboard → copiá su URL pública
   real (arriba del todo de la página del servicio).
2. Abrí **compiler-img-web** → **Environment** → actualizá `GATEWAY_URL`
   con esa URL (si no coincidía con el placeholder).
3. Abrí **compiler-img-gateway** → **Environment** → actualizá
   `CORS_ORIGIN` con la URL pública real de **compiler-img-web**.
4. Cada cambio de variable dispara un redeploy automático de ese servicio.

Si los nombres de los servicios no chocaron con otra cuenta de Render, los
placeholders del paso 3 ya van a ser correctos y este paso es solo
verificar — pero no asumas que lo son sin mirar.

## 4. Verificar

```bash
curl https://<tu-gateway>.onrender.com/health
curl -X POST https://<tu-gateway>.onrender.com/api/compile \
  -H "Content-Type: application/json" \
  -d '{"source":"c1 = crear_circulo(radio=50, color=rojo, x=100, y=100);"}'
```

Y abrí `https://<tu-web>.onrender.com` en el navegador — debería compilar
en vivo y permitir exportar SVG/PNG igual que en local.

## Qué es privado y qué es público

Igual que en `docker-compose.yml` (ver [docs/security.md](security.md)):
`compiler-img-compiler`, `compiler-img-projects` y `compiler-img-ai-assist`
son `type: pserv` — **no tienen URL pública**, solo son alcanzables desde
otros servicios de tu cuenta de Render por red privada. Si algo no
conecta, antes de tocar el código revisá que el nombre del servicio en
`render.yaml` coincida exactamente con el que usan `COMPILER_SERVICE_URL`
/ `PROJECTS_SERVICE_URL` / `AI_SERVICE_URL` en `compiler-img-gateway` (el
hostname interno de Render es literalmente el `name:` del servicio).

## Antes de confirmar el Blueprint

`render.yaml` pone `plan: free` en los 5 servicios y en la base de datos.
Los límites del plan gratuito de Render (cuántos servicios free simultáneos
permite una cuenta, cuotas de horas/mes, etc.) cambian con el tiempo y
dependen de tu cuenta — revisá el dashboard de Render antes de confirmar
el Blueprint. Si no te deja crear los 5 como `free`, subí el `plan:` de
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
