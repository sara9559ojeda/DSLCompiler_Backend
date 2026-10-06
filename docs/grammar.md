# Gramática del DSL

## Diseño

El lenguaje tiene una sintaxis **genérica**: toda instrucción es una llamada a
un comando con argumentos posicionales y/o nombrados, opcionalmente asignada
a un identificador para poder referenciarla después (p. ej. desde
`conectar`). El Lexer y el Parser no conocen los nombres de comandos
(`crear_circulo`, `conectar`, ...) ni sus parámetros — eso vive en el
`ShapeRegistry` (`packages/shared/src/registry/shapes.config.ts`), consultado
por el `SemanticAnalyzer`. Añadir una figura nueva es agregar una entrada al
registro; el Lexer/Parser no cambian (principio Open/Closed).

## EBNF

```ebnf
program        = { statement } ;
statement      = ( assignment | command_call ) , ";" ;

assignment     = identifier , "=" , command_call ;
command_call   = identifier , "(" , [ argument_list ] , ")" ;
argument_list  = argument , { "," , argument } ;

(* Los argumentos posicionales deben preceder a los nombrados, igual que en
   la mayoría de lenguajes con llamadas a función (regla validada en el
   analizador semántico, no en esta gramática). *)
argument       = value | named_argument ;
named_argument = identifier , "=" , value ;

value          = number | hex_color | string | identifier ;

number         = [ "-" ] , digit , { digit } , [ "." , digit , { digit } ] ;
hex_color      = "#" , hex_digit , hex_digit , hex_digit , [ hex_digit , hex_digit , hex_digit ] ;
string         = '"' , { any_char_except_quote } , '"' ;
identifier     = letter , { letter | digit | "_" } ;

letter         = "a".."z" | "A".."Z" | "_" ;
digit          = "0".."9" ;
hex_digit      = digit | "a".."f" | "A".."F" ;

comment        = "//" , { any_char_except_newline } , newline ;
```

Un `identifier` usado como `value` es ambiguo a nivel sintáctico a propósito:
puede significar un nombre de color (`rojo`), una referencia a una figura
declarada (`c1`) o un valor de enumeración (`linea`/`flecha`). El
`SemanticAnalyzer` lo desambigua según el `ParamType` declarado por el
parámetro que lo recibe (`color`, `shapeRef`, `string` con `allowedValues`).

## Catálogo de comandos (v0.1)

| Comando | Categoría | Parámetros |
|---|---|---|
| `crear_circulo` | shape | `radio` (number, requerido), `x`, `y` (number, requeridos), `color` (color, opcional) |
| `crear_rectangulo` | shape | `ancho`, `alto`, `x`, `y` (number, requeridos), `color` (color, opcional) |
| `crear_linea` | shape | `x1`, `y1`, `x2`, `y2` (number, requeridos), `color` (color, opcional) |
| `crear_texto` | shape | `contenido` (string, requerido), `x`, `y` (number, requeridos), `color` (color, opcional), `tamano` (number, opcional) |
| `conectar` | connection | `origen`, `destino` (shapeRef, requeridos), `tipo` (string ∈ {`linea`,`flecha`}, opcional), `color` (color, opcional) |

Los valores por defecto y los colores válidos están en
`packages/shared/src/registry/colors.config.ts` y `dsl-defaults.config.ts` —
nunca como literales sueltos en el Lexer/Parser/SemanticAnalyzer.

## Ejemplo

```
c1 = crear_circulo(radio=50, color=rojo, x=100, y=100);
r1 = crear_rectangulo(ancho=80, alto=40, color=azul, x=200, y=150);
conectar(c1, r1, tipo=linea);
```
