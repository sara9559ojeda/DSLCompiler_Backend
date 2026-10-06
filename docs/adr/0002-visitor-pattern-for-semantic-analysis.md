# ADR 0002: Visitor pattern en la resolución de valores del AST

## Contexto

Un valor en el DSL (`NumberLiteralNode`, `StringLiteralNode`,
`HexColorLiteralNode`, `IdentifierValueNode`) debe resolverse de forma
distinta según su tipo concreto **y** según el `ParamType` del parámetro que
lo recibe (p. ej. un `IdentifierValueNode` es un color, una referencia a
figura o un valor de enumeración, dependiendo de dónde aparezca).

## Decisión

`ValueNode` expone `accept<T>(visitor: IValueVisitor<T>): T`. El
`SemanticAnalyzer` implementa `IValueVisitor<ValueOutcome>` y resuelve cada
variante en su propio método (`visitNumberLiteral`, `visitStringLiteral`,
`visitHexColorLiteral`, `visitIdentifierValue`), usando un campo interno
`activeParam` para saber contra qué `ParamDefinition` está validando el
valor actual.

## Consecuencias

- **Single Responsibility**: la lógica de "qué significa este literal" está
  separada por tipo de nodo, no en una cadena de `if/instanceof`.
- **Interface Segregation**: el AST no depende del analizador semántico ni de
  ningún otro consumidor — solo expone `accept`.
- Si en el futuro se necesita otro recorrido sobre los mismos nodos de valor
  (p. ej. un linter de estilo), basta con implementar `IValueVisitor<T>` de
  nuevo, sin tocar las clases de nodo.
