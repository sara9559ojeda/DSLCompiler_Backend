# ADR 0009: Fusionar el registro de `shared` en `compiler-core` (sin dependencias cruzadas)

## Contexto

[ADR 0008](0008-extract-compiler-core-package.md) extrajo `packages/
compiler-core` para que el frontend pudiera instalarlo fuera del monorepo.
La decisión de *cómo* instalarlo entre repos separados (ver conversación
del equipo) terminó en **dependencia de Git directa al repo del backend**
en vez de publicar en npm — sin necesidad de cuenta ni login.

Al probarlo de verdad (`npm install` contra el repo real en GitHub), falló:
`compiler-core` dependía de `@compiler-img/shared` (`"@compiler-img/
shared": "0.1.0"`, un semver normal, no una URL de Git). Cuando npm
instala una dependencia de Git, corre su script `prepare` (que compila
TypeScript) **en un clon aislado, antes de resolver el resto del árbol de
dependencias** — en ese momento `@compiler-img/shared` todavía no existe
en disco, así que `tsc` falla con "Cannot find module '@compiler-img/
shared'". Un `overrides` en el `package.json` del consumidor no lo
soluciona: el problema no es *qué* versión de `shared` se resuelve, es que
el `prepare` de `compiler-core` corre antes de que exista ninguna.

## Decisión

`packages/compiler-core` pasa a ser **completamente autocontenido**: el
registro de figuras/colores y los tipos de diagnóstico que antes vivían en
`packages/shared` (`registry/`, `diagnostics/`) se mueven dentro de
`compiler-core`. Ya no tiene ninguna dependencia de npm — ni siquiera
interna. `packages/shared` queda reducido a lo que de verdad es
exclusivo del backend: los contratos HTTP (TypeBox) que usan `apps/
gateway`, `services/compiler`, `services/projects` y `services/ai-assist`
para validar payloads — ninguno de los cuales necesita instalarse fuera
del monorepo, así que `shared` nunca necesita el tratamiento de
dependencia de Git.

`services/ai-assist` (que sí necesitaba el registro de figuras para
construir el prompt del modelo) pasa a importar `SHAPE_DEFINITIONS`,
`NAMED_COLORS`, etc. desde `@saramariaojeda9559/compiler-core` en vez de
`@compiler-img/shared` — sigue siendo workspace-local, solo cambió de
paquete.

## Consecuencias

- **Regla general confirmada con esto**: un paquete pensado para
  instalarse como dependencia de Git (o publicarse en npm) no puede tener
  dependencias propias que *también* sean paquetes sin publicar del mismo
  monorepo — o esas dependencias deben resolverse de la misma forma
  (todas por Git, todas publicadas) y aun así el `prepare` anidado sigue
  siendo frágil. Lo robusto es que el paquete externo no dependa de nada
  interno.
- `apps/web` ya no importa `@compiler-img/shared` en ningún lado —
  depende únicamente de `@saramariaojeda9559/compiler-core`. Confirmado con
  `grep -r "@compiler-img/shared" apps/web/src` → sin resultados.
- Verificado con una instalación real (`npm install` en un directorio
  temporal, con `"@saramariaojeda9559/compiler-core":
  "github:sara9559ojeda/DSLCompiler#path:packages/compiler-core"` como
  única dependencia) antes de dar esto por resuelto — no alcanza con que
  compile en el monorepo.
