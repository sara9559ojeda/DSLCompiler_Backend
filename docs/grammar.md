# Gramática del DSL (lenguaje 2.0)

Versión del lenguaje: `LANGUAGE_VERSION` en `packages/compiler-core/src/config/compiler.config.ts`
(el Web Worker y el backend la importan del mismo paquete, así que no pueden divergir).

## Diseño

- **Los comandos siguen siendo llamadas genéricas.** `crear_circulo(...)`,
  `conectar(...)`, etc. son `nombre(argumentos)`: el Lexer y el Parser no
  conocen sus nombres ni parámetros. Eso vive en el `ShapeRegistry`
  (`registry/shapes.config.ts`), consultado por el `SemanticAnalyzer`.
- **Todo programa 1.x sigue siendo válido** y produce el mismo SVG (hay una
  prueba de regresión que lo comprueba). Las palabras reservadas nuevas son
  `const let funcion para si sino retornar grupo`.
- **El "análisis semántico" ahora ejecuta el programa** de forma controlada
  (intérprete sobre el AST, sin `eval`) y produce la `Scene`: ver ADR 0015.

## EBNF

```ebnf
program        = { statement } ;

statement      = var_decl , ";"
               | assignment , ";"
               | call , ";"
               | return_stmt , ";"
               | function_decl | for_stmt | if_stmt | group_stmt | block ;

var_decl       = ( "const" | "let" ) , identifier , "=" , expression ;
assignment     = identifier , "=" , expression ;          (* "c1 = crear_circulo(...)" o "i = i + 1" *)
call           = identifier , "(" , [ argument , { "," , argument } ] , ")" ;
argument       = [ identifier , "=" ] , expression ;

function_decl  = "funcion" , identifier , "(" , [ identifier , { "," , identifier } ] , ")" , block ;
for_stmt       = "para" , "(" , [ var_decl | assignment ] , ";" , [ expression ] , ";" , [ assignment ] , ")" , block ;
if_stmt        = "si" , "(" , expression , ")" , block , [ "sino" , ( if_stmt | block ) ] ;
group_stmt     = "grupo" , "(" , [ argument , { "," , argument } ] , ")" , block ;
return_stmt    = "retornar" , [ expression ] ;
block          = "{" , { statement } , "}" ;

(* Precedencia, de menor a mayor. Todos los binarios son asociativos por la izquierda. *)
expression     = or ;
or             = and , { "||" , and } ;
and            = equality , { "&&" , equality } ;
equality       = comparison , { ( "==" | "!=" ) , comparison } ;
comparison     = term , { ( "<" | "<=" | ">" | ">=" ) , term } ;
term           = factor , { ( "+" | "-" ) , factor } ;
factor         = unary , { ( "*" | "/" | "%" ) , unary } ;
unary          = ( "-" | "!" ) , unary | primary ;
primary        = number | string | hex_color | call | identifier | "(" , expression , ")" ;

number         = digit , { digit } , [ "." , digit , { digit } ] ;
hex_color      = "#" , hex_digit , { hex_digit } ;
string         = '"' , { any_char_except_quote } , '"' ;
identifier     = letter , { letter | digit | "_" } ;
comment        = "//" , { any_char_except_newline } ;
```

`-5` se lee como un literal (no como una negación), por eso `x=-5` sigue siendo
un valor editable visualmente.

## Valores y tipos

| Tipo | Origen | Notas |
|---|---|---|
| número | `12`, `3.5`, operaciones | `+ - * / %` |
| texto | `"hola"` | `"a" + "b"` y `"n=" + 3` concatenan (máx. 10 000 caracteres) |
| color | `rojo`, `#ff8800` | no admite aritmética |
| figura | `c1 = crear_circulo(...)` | solo para `conectar` |

No hay booleanos: las comparaciones y `&&`, `||`, `!` producen `1` o `0`, y una
condición es verdadera si es distinta de `0` (o de `""`).

Un identificador suelto como argumento se interpreta así: **1)** si es una
variable con un valor del tipo que pide el parámetro, se usa; **2)** si no, el
tipo del parámetro decide qué significa la palabra (nombre de color, valor de
enumeración como `flecha`, o figura declarada). Por eso `color=azul` sigue
funcionando aunque exista una figura llamada `azul`.

## Ámbitos

Léxicos: cada bloque, cada iteración de un bucle y cada llamada a función
tienen el suyo. Una función ve las variables **globales** (no las del que la
llama). Se puede ocultar un nombre en un ámbito interno, pero no repetirlo en
el mismo (`SEM-017`). Las funciones se declaran solo en el nivel superior y
pueden usarse antes de su declaración.

## Unidades

**Los ángulos van en grados**: `sin`, `cos`, `tan`, `rotacion`. `cos(i * 30)`
recorre un círculo en pasos de 30°. Los resultados se redondean a 9 decimales
para no ver `6e-17` en el SVG.

## Funciones matemáticas

`sin cos tan sqrt abs min max floor ceil round` (`min` y `max` aceptan 2 o más
argumentos). Se listan desde `BUILTIN_FUNCTIONS`.

## Catálogo de comandos

| Comando | Categoría | Parámetros |
|---|---|---|
| `crear_circulo` | figura | `radio`, `x`, `y` (requeridos), `color`, `opacidad` |
| `crear_rectangulo` | figura | `ancho`, `alto`, `x`, `y` (requeridos), `color`, `opacidad`, `rotacion` |
| `crear_linea` | figura | `x1`, `y1`, `x2`, `y2` (requeridos), `color`, `opacidad` |
| `crear_texto` | figura | `contenido`, `x`, `y` (requeridos), `color`, `tamano`, `opacidad`, `rotacion` |
| `conectar` | conexión | `origen`, `destino` (requeridos), `tipo` ∈ {`linea`,`flecha`}, `color` |
| `grupo(...) { }` | bloque | `x`, `y`, `escala`, `rotacion`, `opacidad` (todos opcionales) |

`opacidad` va de 0 a 1 (por defecto 1). `rotacion` gira alrededor del centro del
rectángulo / del punto del texto. Un grupo aplica, en este orden,
`translate(x, y) · rotate(rotacion) · scale(escala)` a sus miembros, que usan
coordenadas locales; los grupos se anidan.

Los parámetros nuevos se agregaron **al final** de cada comando, así que los
argumentos posicionales de programas 1.x no cambian de significado.

## Límites de ejecución

Un programa es código: nada puede colgar el navegador ni el backend. Se miden
(valores por defecto en `DEFAULT_EXECUTION_LIMITS`):

| Límite | Valor | Diagnóstico |
|---|---|---|
| iteraciones por bucle | 10 000 | `SEM-022` |
| profundidad de llamadas | 64 | `SEM-023` |
| elementos en la escena | 5 000 | `SEM-024` |
| caracteres de un texto | 10 000 | `SEM-024` |
| pasos de evaluación | 500 000 | `SEM-025` |
| cancelación / tiempo máximo | `isCancelled`, `deadlineMs` | `SEM-026` / `SEM-025` |

Al superar un límite el programa se detiene con un diagnóstico claro. Los
errores dentro de un bucle se informan una sola vez, no una por iteración.

## Identificadores estables y mapa al código

Cada figura de la `Scene` lleva su `origin`: de qué llamada salió y dónde está
escrito cada argumento (`span` = rango `[start, end)` de offsets del texto) y
si es editable (`literal`), calculado (`expression`) o no escrito (`default`).

- Figura con nombre, fuera de bucles/funciones: su nombre (`c1`).
- Figura anónima, fuera de bucles/funciones: `__shape_N` (como en 1.x).
- Figura generada dentro de un bucle o función: `<nombre>@<sitio>.<instancia>`.
  El *sitio* es el número de la llamada en orden de aparición en el código; no
  cambia cuando solo se editan valores.

## Ejemplo

```
const cantidad = 12;

funcion petalo(x, y, ang) {
  crear_circulo(x=x + cos(ang) * 40, y=y + sin(ang) * 40, radio=14, color=rosa);
}

para (let i = 0; i < cantidad; i = i + 1) {
  petalo(250, 200, i * 360 / cantidad);
}

grupo(x=500, y=100, escala=0.5, rotacion=15) {
  r1 = crear_rectangulo(ancho=80, alto=40, x=0, y=0, color=azul);
}
```

## Diagramas con layout automático (`diagrama`)

```
diagrama <tipo> [ "(" argumentos ")" ] "{" instrucciones "}"
```

`<tipo>`: `flujo`, `arquitectura`, `organigrama`, `proceso`, `red`. Define la dirección, el espaciado y la forma de nodo por defecto.
Los argumentos son opcionales: `x`, `y` (desplazamiento del diagrama, 40 por defecto), `direccion` (`vertical` | `horizontal`) y `espaciado`.

Dentro del bloque (que admite bucles, funciones y condicionales como cualquier otro):

- `nodo(etiqueta, tipo, color, x, y, ancho, alto, opacidad)`: `tipo` ∈ `caja`, `redondeado`, `inicio`, `decision`, `circulo`. Se puede asignar (`a = nodo("Inicio")`) y usar en `conectar`.
- `conectar(origen, destino, tipo, color, etiqueta)`: dentro de un diagrama la conexión es una flecha salvo que se indique `tipo`.

Un nodo **sin** `x`/`y` lo coloca el motor de layout (posición *automática*). Escribir `x` y/o `y` lo **fija** (posición *manual*) en ese eje; el resto sigue siendo automático. `nodo` fuera de `diagrama` es SEM-031; un tipo desconocido es SEM-032; `diagrama` sin tipo es SYN-013.
El lienzo crece si el diagrama no cabe en 800×600. Las conexiones son rectas y arrancan en el contorno de cada nodo.
