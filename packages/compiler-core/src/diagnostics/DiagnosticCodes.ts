/**
 * Catalog of every diagnostic the compiler can emit. Prefix = phase:
 * LEX (lexer), SYN (parser), SEM (semantic analysis). Codes are stable —
 * never renumber or reuse one; retire it and add a new one instead.
 */
export const DIAGNOSTIC_CODES = {
  "LEX-001": "Carácter inesperado",
  "LEX-002": "Color hexadecimal sin dígitos",
  "LEX-003": "Cadena de texto sin cerrar",
  "SYN-001": "Falta ';' al final de la instrucción",
  "SYN-002": "Falta '=' después del identificador",
  "SYN-003": "Falta el nombre del comando",
  "SYN-004": "Falta '(' después del comando",
  "SYN-005": "Falta ')' al cerrar los argumentos",
  "SYN-006": "Se esperaba un valor",
  "SEM-001": "Demasiadas instrucciones",
  "SEM-002": "Identificador ya declarado",
  "SEM-003": "Comando no asignable",
  "SEM-004": "Comando desconocido",
  "SEM-005": "Argumento posicional después de uno nombrado",
  "SEM-006": "Demasiados argumentos posicionales",
  "SEM-007": "Argumento duplicado",
  "SEM-008": "Parámetro desconocido",
  "SEM-009": "Falta un parámetro requerido",
  "SEM-010": "Tipo de valor incorrecto",
  "SEM-011": "Valor no permitido",
  "SEM-012": "Color desconocido",
  "SEM-013": "Figura no declarada",
  "SEM-014": "Se esperaba texto entre comillas",
} as const;

export type DiagnosticCode = keyof typeof DIAGNOSTIC_CODES;
