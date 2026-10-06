# ADR 0001: Gramática genérica + registro de figuras

## Contexto

El DSL necesita soportar varias figuras (círculo, rectángulo, línea, texto,
conexiones) y crecer con nuevas en el futuro sin que cada adición implique
tocar el Lexer o el Parser.

## Decisión

La gramática define un único patrón sintáctico —
`[id =] comando(arg, ..., nombre=valor, ...)` — sin conocer los nombres de
comandos válidos. El catálogo real de comandos (nombre, categoría,
parámetros, tipos, valores por defecto, valores permitidos) vive en
`ShapeDefinition[]` (`packages/shared/src/registry/shapes.config.ts`),
consultado por el `SemanticAnalyzer` a través de la interfaz `IShapeRegistry`.

## Consecuencias

- **Open/Closed**: agregar una figura es agregar una entrada de
  configuración; Lexer y Parser no cambian.
- El Parser no puede dar errores "conoce mejor" sobre parámetros específicos
  de cada figura — esos errores (parámetro faltante, tipo incorrecto, valor
  no permitido) se reportan en la fase semántica, con la posición exacta del
  token.
- Un identificador usado como valor (`value = ... | identifier`) es
  intencionalmente ambiguo en la gramática; se resuelve en el analizador
  semántico según el `ParamType` esperado (color, referencia a figura,
  enumeración de texto).
