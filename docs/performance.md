# Performance (INP < 200ms)

Medido contra el **build de producción real**, corriendo en el stack
completo de `docker-compose` (frontend servido por nginx en `:8080`, detrás
del gateway real en `:4000`) — no contra `vite dev`.

## 1. Interacciones clave: Event Timing API (proxy real de INP)

`web-vitals`/INP se basa en la [Event Timing
API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming)
del navegador. Se armó un `PerformanceObserver` sobre `type: "event"` con
`durationThreshold: 16` (el mínimo que expone el navegador — cualquier
interacción por debajo de eso ni siquiera genera una entrada) y se
ejecutaron, en un Chromium real, las tres interacciones que pide el
enunciado:

| Interacción | Resultado |
|---|---|
| Cambiar tema (claro ↔ oscuro), 2 veces | Sin entradas — cada click se procesó en menos de 16ms |
| Escribir en el editor (dispara recompilación) | Sin entradas |
| Exportar SVG | Sin entradas |
| Exportar PNG (llamada real de red al gateway) | Sin entradas |

**Cero interacciones cruzaron siquiera el piso de 16ms que reporta el
navegador** — muy por debajo del presupuesto de 200ms. Esto no es
casualidad: es la consecuencia directa de tres decisiones de diseño (ver
`apps/web/README.md`):

1. **Compilar corre en un Web Worker** (`compiler.worker.ts`) — el hilo
   principal nunca hace el parseo; el evento de teclado solo actualiza el
   estado de React.
2. **Debounce de 300ms** antes de disparar el compile — evita recompilar en
   cada tecla.
3. **Exportar PNG usa estado optimista** — el click solo cambia un booleano
   (`isExportingPng`) de forma síncrona; el `fetch` al gateway ocurre
   después, sin bloquear el evento del click.

## 2. Lighthouse (desktop, performance)

Ejecutado con `lighthouse` CLI contra `http://localhost:8080` real:

| Métrica | Valor | Nota |
|---|---|---|
| First Contentful Paint | 0.5 s | El shell (toolbar, layout, editor placeholder) pinta casi de inmediato — Monaco (~3.3MB) no está en el bundle inicial |
| Largest Contentful Paint | 4.2 s | Ver "Limitación conocida" abajo |
| Total Blocking Time | 150 ms | Proxy de lab para responsividad de interacción — dentro de rango aceptable |
| Cumulative Layout Shift | 0 | Sin saltos de layout |
| Speed Index | 1.3 s | |
| Time to Interactive | 4.4 s | |
| **Performance score** | **0.74** | |

### Limitación conocida: LCP

El elemento de "largest contentful paint" es la superficie del editor
Monaco, que se renderiza recién cuando termina de cargar su chunk
asíncrono (~3.3MB sin comprimir, ~857KB gzip — son los ~70 modos de
lenguaje que Monaco registra internamente, no código nuestro). Eso empuja
el LCP a 4.2s aunque el resto de la página ya sea interactivo. El bundle
inicial (`index-*.js`) pesa **156KB** (gzip 50.8KB) — la carga perezosa de
Monaco sí está funcionando (ver el `useEffect` con `import()` dinámico en
`CodeEditor.tsx`); el costo simplemente se paga en LCP en vez de en el
bundle inicial, que es el trade-off correcto para INP (el objetivo
explícito de esta fase) pero dejaría LCP como trabajo pendiente en una
optimización futura (p. ej. un placeholder de editor más "real" mientras
carga, o cargar un subconjunto de lenguajes de Monaco en vez del bundle
completo).

## 3. Cómo reproducir

```bash
docker compose up -d --build
npx lighthouse http://localhost:8080 --preset=desktop --only-categories=performance
```

Para las interacciones, abrir `http://localhost:8080` en Chrome DevTools →
Performance, o inyectar el mismo `PerformanceObserver` de la sección 1 en
la consola antes de interactuar.
