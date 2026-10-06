# @compiler-img/compiler

Núcleo del compilador: Lexer → Parser → AST → SemanticAnalyzer →
CodeGenerator. Ver [`docs/grammar.md`](../../docs/grammar.md) para la
gramática formal y [`docs/adr/`](../../docs/adr) para las decisiones de
diseño.

## Desarrollo

```bash
npm install
npm test              # vitest run
npm run test:watch
npm run typecheck
```

## CLI

Un archivo `.dsl` de ejemplo:

```
c1 = crear_circulo(radio=50, color=rojo, x=100, y=100);
r1 = crear_rectangulo(ancho=80, alto=40, color=azul, x=200, y=150);
conectar(c1, r1, tipo=linea);
```

Compilarlo a SVG o PNG:

```bash
npm run cli -- diagrama.dsl --format=svg --out=diagrama.svg
npm run cli -- diagrama.dsl --format=png --out=diagrama.png
```

Los errores léxicos/sintácticos/semánticos se imprimen en `stderr` con
posición (`archivo:línea:columna`); el proceso termina con código de salida
1 si el programa no compila.

## Uso como librería

```ts
import { createDefaultPipeline } from "@compiler-img/compiler";

const result = createDefaultPipeline().compile(source);
if (result.success) {
  console.log(result.svg);
} else {
  console.error(result.diagnostics);
}
```
