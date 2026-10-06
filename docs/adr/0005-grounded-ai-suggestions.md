# ADR 0005: Sugerencias de IA fundamentadas (grounded) en el compilador real

## Contexto

`/suggest` le pide a Claude que genere código DSL a partir de una
descripción en lenguaje natural. Un LLM puede alucinar sintaxis o
parámetros que no existen, incluso con un prompt cuidadoso. Devolver ese
código directamente al usuario sin verificarlo sería, en el mejor caso,
inútil (no compila) y en el peor, confuso (parece código válido pero no lo
es).

## Decisión

`SuggestionService` nunca devuelve la respuesta del modelo sin antes
compilarla de verdad, usando `DslValidator` (que envuelve
`@compiler-img/compiler/browser` — el mismo pipeline Lexer→Parser→
SemanticAnalyzer→CodeGenerator que corre en el navegador y en el compiler
service, no una reimplementación). Si el primer intento no compila, se
arma un segundo prompt que incluye el código inválido y los diagnósticos
exactos del compilador (`buildRetryPrompt.ts`), y se le pide a Claude que
corrija. El segundo intento es la respuesta final — válida o no,
siempre viene acompañada de sus diagnósticos, para que el frontend pueda
mostrar honestamente el resultado.

El contexto de gramática que recibe el modelo en el system prompt
(`buildGrammarContext.ts`) se genera a partir de `SHAPE_DEFINITIONS`
(`@compiler-img/shared`) en tiempo de ejecución — no es un texto
copiado a mano que pueda quedar desactualizado si el registro cambia.

## Consecuencias

- Costo: en el peor caso, dos llamadas al modelo por sugerencia en vez de
  una. Se aceptó como trade-off razonable frente a devolver código roto.
- `/suggest` siempre responde `{ dslSource, valid, diagnostics }` — el
  frontend decide qué hacer si `valid` es `false` (mostrar el intento con
  sus errores, en vez de fallar la petición completa).
- No hay un tercer intento: dos intentos balancean fundamentación real
  contra latencia/costo. Si la tasa de fallo en la práctica resulta alta,
  ajustar este límite es un cambio de una línea en `SuggestionService`.
