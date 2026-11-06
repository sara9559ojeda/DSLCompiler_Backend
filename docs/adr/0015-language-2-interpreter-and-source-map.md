# ADR 0015 — Lenguaje 2.0: intérprete controlado y mapa al código

Estado: aceptado · Fecha: 2026-11

## Contexto

DSL Studio pasa de "una lista de figuras" a un lenguaje gráfico programable
(variables, expresiones, bucles, funciones, grupos) que además debe poder
editarse **visualmente** sobre el canvas reescribiendo el código fuente.

## Decisiones

1. **El `SemanticAnalyzer` ejecuta el programa.** En lugar de añadir una
   etapa nueva entre el analizador y la `Scene`, el analizador pasa de "validar
   literales" a "interpretar el AST con ámbitos" y sigue produciendo la misma
   `Scene`. Así el optimizador, el codegen, los contratos gRPC/HTTP y el
   inspector no cambian de forma. El pipeline conserva sus cinco etapas
   (lexer, parser, semantic, optimizer, codegen).
2. **Sin `eval`, sin `new Function`.** Es un intérprete sobre el AST con un
   conjunto cerrado de operaciones. Los programas no pueden tocar JavaScript.
3. **Todo se mide** (`ExecutionLimits`): iteraciones, profundidad de llamadas,
   elementos, longitud de texto y pasos totales; más cancelación (`isCancelled`)
   y un tiempo máximo opcional (`deadlineMs`). Los límites son deterministas
   (cuentan pasos, no milisegundos) para que navegador y backend produzcan el
   mismo resultado; el reloj es solo una red de seguridad.
4. **Compatibilidad hacia atrás.** Palabras reservadas nuevas, parámetros nuevos
   *al final* de cada comando, mismos ids (`c1`, `__shape_N`), y SVG idéntico
   para programas 1.x (prueba de regresión). Cambios deliberados:
   - `-5` ya no es un token de número sino `-` + número; el parser lo vuelve a
     plegar en un literal (`x=-5` sigue siendo un literal editable).
   - Nuevos nombres de color (`rosa`, `celeste`, `marron`, `turquesa`, `dorado`).
   - Un identificador no declarado en un parámetro numérico ahora da
     `SEM-015` (variable no definida) en vez de `SEM-010`.
5. **Ángulos en grados.** Es un lenguaje para dibujar: `cos(i * 30)` es más
   natural que radianes. Documentado en `docs/grammar.md` y `ANGLE_UNIT`.
6. **Sin booleanos.** Comparaciones y lógica producen `1`/`0`. Menos tipos, menos
   casos en el analizador y en la UI.
7. **Grupos en la `Scene`, no aplanados.** La `Scene` lleva `groups` y cada
   figura un `groupId`. Aplanar (aplicar la transformación a cada figura) haría
   imposible rotar un círculo dentro de un grupo y perdería el vínculo con el
   código. El optimizador trata las figuras en grupos o rotadas como "no
   acotables", así que nunca las elimina por geometría (equivalencia visual
   garantizada).
8. **`Span` en cada nodo y `origin` en cada figura.** El `Lexer` registra
   `offset`/`length` por token; el `Parser` los convierte en `span` (rango
   `[start, end)`) de cada expresión, argumento y sentencia. El analizador copia
   a cada figura: sitio de la llamada, `callSpan`, y por parámetro
   `literal | expression | default` con su `span`. El editor visual usa solo
   eso para reescribir el código (Fase C): nunca regenera el archivo.
9. **Ids estables.** Figura con nombre = su nombre; anónima = `__shape_N`;
   generada en bucle/función = `<nombre>@<sitio>.<instancia>`, donde el *sitio*
   es el ordinal de la llamada en el código fuente, que no cambia al editar
   valores.

## Consecuencias

- `compiler-core` crece (~2k líneas) pero sigue sin dependencias ni APIs de
  navegador/Node: el mismo código corre en el Worker y en el backend.
- La versión del lenguaje (`LANGUAGE_VERSION`) viaja con el paquete; ambos lados
  la importan del mismo lugar y las pruebas de integración comparan ambos.
- Una edición visual de un parámetro dentro de un bucle afecta a todas las
  instancias: la `Scene` marca esos sitios como `dynamic` para que la UI lo
  avise o lo bloquee en lugar de sorprender.
