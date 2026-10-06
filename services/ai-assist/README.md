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
