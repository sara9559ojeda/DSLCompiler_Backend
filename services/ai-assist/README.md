# @compiler-img/ai-assist

Microservicio independiente para funciones asistidas por IA: generar DSL a
partir de una descripción en lenguaje natural, y explicar errores de
compilación en lenguaje sencillo. Usa el SDK de Anthropic (Claude). Solo
alcanzable a través del [gateway](../../apps/gateway).

## Rutas

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| POST | `/suggest` | `{ prompt }` | Genera DSL a partir de una descripción; lo valida contra el compilador real antes de responder |
| POST | `/explain-error` | `{ source, diagnostics }` | Explica los diagnósticos del compilador en español, para principiantes |

## Por qué esto no es un simple passthrough al LLM

`/suggest` nunca confía ciegamente en lo que devuelve el modelo: el
resultado se compila de verdad con `@compiler-img/compiler/browser` (el
mismo pipeline que corre en el navegador y en el compiler service). Si no
compila, se reintenta **una vez** pasándole a Claude los diagnósticos
exactos del error, y se devuelve el segundo intento (válido o no, siempre
con sus diagnósticos) — ver `SuggestionService.ts` y
[ADR 0005](../../docs/adr/0005-grounded-ai-suggestions.md).

El contexto de gramática que se le da al modelo (`buildGrammarContext.ts`)
se genera en tiempo de ejecución a partir de `SHAPE_DEFINITIONS`
(`@compiler-img/shared`) — la misma fuente de verdad que usa el
`SemanticAnalyzer`. Si se agrega una figura nueva al registro, el prompt
del modelo la incluye automáticamente, sin tocar este servicio.

## Desarrollo

```bash
cp .env.example .env   # ANTHROPIC_API_KEY es obligatoria para /suggest y /explain-error
npm install
npm test                # usa un FakeClaudeClient — no llama a la API real ni requiere la key
npm start
```

## Diseño para testabilidad (DIP)

`buildServer({ claudeClient, validator })` acepta ambas dependencias
inyectadas. En producción son `AnthropicClaudeClient` (HTTP real a la API
de Anthropic) y `DslValidator` (el compilador real); los tests usan un
`FakeClaudeClient` con respuestas guionadas para probar el flujo de
reintento sin red ni costo.

## `POST /assist` (asistente de IA)

Body: `{ mode: "generate" | "modify" | "explain", prompt, source? }` (prompt ≤ 1000 caracteres, source ≤ 20 000; otros campos se descartan).

- **generate**: programa nuevo a partir de una descripción.
- **modify**: devuelve el programa **completo** modificado (conserva comentarios, orden y nombres); necesita `source`.
- **explain**: explica el código y sus errores; los diagnósticos los calcula el servidor compilando `source`.

Cada propuesta pasa por el compilador real. Si falla, se reintenta con los diagnósticos reales hasta `ASSIST_MAX_ATTEMPTS` intentos o `ASSIST_DEADLINE_MS`. La respuesta incluye `valid`, `diagnostics`, `svg` (vista previa renderizada por el compilador) y `attempts`. **Nada se aplica en el servidor**: el cliente muestra el diff y el usuario acepta o rechaza.

Protecciones: el contenido del usuario va en etiquetas marcadas como datos (y se neutralizan intentos de cerrarlas), ningún campo del cliente llega al system prompt, cancelar la petición aborta la llamada al modelo, límites de tamaño, timeout, tokens máximos y, en el gateway, `AI_RATE_LIMIT_MAX` por ventana y cliente.

Variables de entorno: `ANTHROPIC_API_KEY` (solo backend), `ANTHROPIC_MODEL`, `ANTHROPIC_MAX_TOKENS` (2048), `ANTHROPIC_TIMEOUT_MS` (30000), `ASSIST_MAX_ATTEMPTS` (3), `ASSIST_DEADLINE_MS` (45000), `ASSIST_MAX_OUTPUT_CHARS` (12000). Gateway: `AI_RATE_LIMIT_MAX` (10), `AI_RATE_LIMIT_WINDOW_MS` (60000).
