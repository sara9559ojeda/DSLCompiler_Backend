# @compiler-img/compiler-core

El compilador en sí: Lexer → Parser → AST → SemanticAnalyzer →
CodeGenerator → SVG. Cero dependencias de Node — se importa igual desde un
Web Worker en el navegador (`apps/web`) que desde un servicio Node
(`services/compiler`, `services/ai-assist`). Ver
[ADR 0008](../../docs/adr/0008-extract-compiler-core-package.md) para el
porqué de este paquete separado, y
[`docs/grammar.md`](../../docs/grammar.md) para la gramática formal del
DSL.

## Uso

```ts
import { createDefaultPipeline } from "@compiler-img/compiler-core";

const result = createDefaultPipeline().compile(source);
if (result.success) {
  console.log(result.svg);
} else {
  console.error(result.diagnostics);
}
```

No incluye exportación a PNG (necesita `sharp`, nativo de Node) ni nada de
HTTP — eso vive en [`services/compiler`](../../services/compiler), que
depende de este paquete.

## Desarrollo

```bash
npm install
npm test
npm run typecheck
```
