import type { Diagnostic, SourcePosition } from "../diagnostics/Diagnostic.js";
import type { DiagnosticCode } from "../diagnostics/DiagnosticCodes.js";
import { closestMatch, didYouMean } from "../diagnostics/suggest.js";
import type { ShapeDefinition } from "../registry/ShapeDefinition.js";
import type { ParamType } from "../registry/ParamDefinition.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAX_STATEMENTS_PER_PROGRAM } from "../config/compiler.config.js";
import type { ProgramNode } from "../ast/nodes/ProgramNode.js";
import type { StatementNode } from "../ast/nodes/StatementNode.js";
import type { AssignmentNode } from "../ast/nodes/AssignmentNode.js";
import type { CommandCallNode } from "../ast/nodes/CommandCallNode.js";
import {
  type ValueNode,
  type IValueVisitor,
  type NumberLiteralNode,
  type StringLiteralNode,
  type HexColorLiteralNode,
  type IdentifierValueNode,
} from "../ast/nodes/ValueNode.js";
import type { IShapeRegistry } from "./ShapeRegistry.js";
import type { ColorResolver } from "./ColorResolver.js";
import type { Scene, ResolvedShape, ResolvedConnection } from "./Scene.js";

export interface SemanticAnalysisResult {
  readonly scene: Scene;
  readonly diagnostics: readonly Diagnostic[];
}

interface ResolvedCommandCall {
  readonly definition: ShapeDefinition;
  readonly params: Record<string, number | string>;
}

type ValueOutcome = { ok: true; value: number | string } | { ok: false };

const DUPLICATE_HINT = "Deja un solo valor para este parámetro.";

const EXAMPLE_VALUES: Readonly<Record<string, string>> = {
  number: "50",
  color: "rojo",
  string: '"Hola"',
  shapeRef: "c1",
} satisfies Record<ParamType, string>;

const TYPE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  number: "un número",
  color: "un color",
  string: "un texto entre comillas",
  shapeRef: "el nombre de una figura declarada",
} satisfies Record<ParamType, string>;

/**
 * Validates the AST against the ShapeRegistry and lowers it into a Scene
 * (the IR the CodeGenerator draws from). Implements IValueVisitor because
 * value literals are the one place in the AST that vary in shape — resolving
 * each kind (number/string/hex/identifier) differently is exactly what the
 * Visitor pattern is for.
 */
export class SemanticAnalyzer implements IValueVisitor<ValueOutcome> {
  private readonly diagnostics: Diagnostic[] = [];
  private readonly symbolTable = new Map<string, ResolvedShape>();
  private readonly shapes: ResolvedShape[] = [];
  private readonly connections: ResolvedConnection[] = [];
  private activeParam: { name: string; type: string; allowedValues?: readonly (string | number)[] } | null =
    null;

  constructor(
    private readonly registry: IShapeRegistry,
    private readonly colorResolver: ColorResolver,
  ) {}

  public analyze(program: ProgramNode): SemanticAnalysisResult {
    if (program.statements.length > MAX_STATEMENTS_PER_PROGRAM) {
      this.error(
        "SEM-001",
        `El programa excede el máximo de ${MAX_STATEMENTS_PER_PROGRAM} instrucciones.`,
        { line: 1, column: 1 },
        "Divide el diagrama en partes más pequeñas.",
      );
      return this.buildResult();
    }

    for (const statement of program.statements) {
      this.analyzeStatement(statement);
    }
    return this.buildResult();
  }

  private buildResult(): SemanticAnalysisResult {
    return {
      scene: { canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }, shapes: this.shapes, connections: this.connections },
      diagnostics: this.diagnostics,
    };
  }

  private analyzeStatement(statement: StatementNode): void {
    if (statement.kind === "assignment") {
      this.analyzeAssignment(statement);
    } else {
      this.analyzeBareCommand(statement);
    }
  }

  private analyzeAssignment(node: AssignmentNode): void {
    if (this.symbolTable.has(node.identifier)) {
      this.error(
        "SEM-002",
        `El identificador '${node.identifier}' ya fue declarado.`,
        node.position,
        `Usa otro nombre, por ejemplo '${this.freeIdentifier(node.identifier)}'.`,
      );
      return;
    }

    const resolved = this.resolveCommandCall(node.call);
    if (!resolved) return;

    if (resolved.definition.category !== "shape") {
      this.error(
        "SEM-003",
        `El comando '${node.call.name}' no puede asignarse a un identificador.`,
        node.position,
        `Quita '${node.identifier} =' y deja solo ${node.call.name}(...).`,
      );
      return;
    }

    const shape: ResolvedShape = { id: node.identifier, kind: node.call.name, params: resolved.params };
    this.symbolTable.set(node.identifier, shape);
    this.shapes.push(shape);
  }

  private analyzeBareCommand(node: CommandCallNode): void {
    const resolved = this.resolveCommandCall(node);
    if (!resolved) return;

    if (resolved.definition.category === "connection") {
      const { origen, destino, ...renderParams } = resolved.params;
      this.connections.push({ fromId: String(origen), toId: String(destino), params: renderParams });
      return;
    }

    const anonymousId = `__shape_${this.shapes.length}`;
    this.shapes.push({ id: anonymousId, kind: node.name, params: resolved.params });
  }

  private resolveCommandCall(call: CommandCallNode): ResolvedCommandCall | null {
    const definition = this.registry.get(call.name);
    if (!definition) {
      const names = this.registry.all().map((candidate) => candidate.name);
      this.error(
        "SEM-004",
        `Comando desconocido: '${call.name}'.`,
        call.position,
        didYouMean(closestMatch(call.name, names)) ?? `Comandos disponibles: ${names.join(", ")}.`,
      );
      return null;
    }

    const rawArgs = new Map<string, ValueNode>();
    let namedSeen = false;
    let positionalIndex = 0;
    let hasError = false;

    for (const arg of call.args) {
      if (arg.name === null) {
        if (namedSeen) {
          this.error(
            "SEM-005",
            "Los argumentos posicionales deben ir antes que los argumentos nombrados.",
            arg.position,
            "Escribe este argumento con nombre (nombre=valor) o muévelo al principio.",
          );
          hasError = true;
          continue;
        }
        const paramDef = definition.params[positionalIndex];
        if (!paramDef) {
          this.error(
            "SEM-006",
            `El comando '${call.name}' no acepta más argumentos posicionales.`,
            arg.position,
            `'${call.name}' recibe: ${definition.params.map((p) => p.name).join(", ")}.`,
          );
          hasError = true;
          continue;
        }
        if (rawArgs.has(paramDef.name)) {
          this.error("SEM-007", `Argumento duplicado: '${paramDef.name}'.`, arg.position, DUPLICATE_HINT);
          hasError = true;
          continue;
        }
        rawArgs.set(paramDef.name, arg.value);
        positionalIndex += 1;
      } else {
        namedSeen = true;
        const paramDef = definition.params.find((p) => p.name === arg.name);
        if (!paramDef) {
          const paramNames = definition.params.map((p) => p.name);
          this.error(
            "SEM-008",
            `Parámetro desconocido '${arg.name}' para el comando '${call.name}'.`,
            arg.position,
            didYouMean(closestMatch(arg.name, paramNames)) ?? `'${call.name}' acepta: ${paramNames.join(", ")}.`,
          );
          hasError = true;
          continue;
        }
        if (rawArgs.has(arg.name)) {
          this.error("SEM-007", `Argumento duplicado: '${arg.name}'.`, arg.position, DUPLICATE_HINT);
          hasError = true;
          continue;
        }
        rawArgs.set(arg.name, arg.value);
      }
    }

    const resolvedParams: Record<string, number | string> = {};
    for (const paramDef of definition.params) {
      const valueNode = rawArgs.get(paramDef.name);
      if (valueNode === undefined) {
        if (paramDef.required) {
          this.error(
            "SEM-009",
            `Falta el parámetro requerido '${paramDef.name}' en '${call.name}'.`,
            call.position,
            `Agrega ${paramDef.name}=${EXAMPLE_VALUES[paramDef.type]} dentro de los paréntesis.`,
          );
          hasError = true;
          continue;
        }
        resolvedParams[paramDef.name] = paramDef.defaultValue as number | string;
        continue;
      }

      this.activeParam = paramDef;
      const outcome = valueNode.accept(this);
      this.activeParam = null;
      if (!outcome.ok) {
        hasError = true;
        continue;
      }
      resolvedParams[paramDef.name] = outcome.value;
    }

    return hasError ? null : { definition, params: resolvedParams };
  }

  visitNumberLiteral(node: NumberLiteralNode): ValueOutcome {
    const param = this.activeParam!;
    if (param.type !== "number") {
      this.typeError(param, "un número", node.position);
      return { ok: false };
    }
    return { ok: true, value: node.value };
  }

  visitStringLiteral(node: StringLiteralNode): ValueOutcome {
    const param = this.activeParam!;
    if (param.type !== "string") {
      this.typeError(param, "una cadena de texto", node.position);
      return { ok: false };
    }
    if (param.allowedValues && !param.allowedValues.includes(node.value)) {
      this.notAllowed(param.name, param.allowedValues, node.value, node.position);
      return { ok: false };
    }
    return { ok: true, value: node.value };
  }

  visitHexColorLiteral(node: HexColorLiteralNode): ValueOutcome {
    const param = this.activeParam!;
    if (param.type !== "color") {
      this.typeError(param, "un color", node.position);
      return { ok: false };
    }
    return { ok: true, value: node.value };
  }

  visitIdentifierValue(node: IdentifierValueNode): ValueOutcome {
    const param = this.activeParam!;
    switch (param.type) {
      case "color": {
        const hex = this.colorResolver.resolve(node.name);
        if (hex === undefined) {
          const colors = this.colorResolver.names();
          this.error(
            "SEM-012",
            `Color desconocido: '${node.name}'.`,
            node.position,
            didYouMean(closestMatch(node.name, colors)) ??
              `Usa un color con nombre (${colors.join(", ")}) o un hexadecimal como #ff8800.`,
          );
          return { ok: false };
        }
        return { ok: true, value: hex };
      }
      case "shapeRef": {
        if (!this.symbolTable.has(node.name)) {
          this.error(
            "SEM-013",
            `Referencia a una figura no declarada: '${node.name}'.`,
            node.position,
            didYouMean(closestMatch(node.name, this.symbolTable.keys())) ??
              `Declara la figura antes, por ejemplo: ${node.name} = crear_circulo(radio=20, x=100, y=100);`,
          );
          return { ok: false };
        }
        return { ok: true, value: node.name };
      }
      case "string": {
        if (param.allowedValues && param.allowedValues.includes(node.name)) {
          return { ok: true, value: node.name };
        }
        if (param.allowedValues) {
          this.notAllowed(param.name, param.allowedValues, node.name, node.position);
          return { ok: false };
        }
        this.error(
          "SEM-014",
          `El parámetro '${param.name}' espera una cadena de texto entre comillas.`,
          node.position,
          `Escríbelo entre comillas: ${param.name}="${node.name}".`,
        );
        return { ok: false };
      }
      default:
        this.typeError(param, "un identificador", node.position);
        return { ok: false };
    }
  }

  private typeError(param: { name: string; type: string }, given: string, position: SourcePosition): void {
    this.error(
      "SEM-010",
      `El parámetro '${param.name}' no admite ${given}.`,
      position,
      `'${param.name}' espera ${TYPE_DESCRIPTIONS[param.type] ?? param.type}, por ejemplo ${param.name}=${EXAMPLE_VALUES[param.type] ?? "..."}.`,
    );
  }

  private notAllowed(
    paramName: string,
    allowed: readonly (string | number)[],
    value: string,
    position: SourcePosition,
  ): void {
    this.error(
      "SEM-011",
      `Valor no permitido para '${paramName}': '${value}'. Valores válidos: ${allowed.join(", ")}.`,
      position,
      didYouMean(closestMatch(value, allowed.map(String))) ?? `Usa uno de: ${allowed.join(", ")}.`,
    );
  }

  /** First `<base>2`, `<base>3`, … not yet taken — for the "use another name" suggestion. */
  private freeIdentifier(base: string): string {
    let suffix = 2;
    while (this.symbolTable.has(`${base}${suffix}`)) suffix += 1;
    return `${base}${suffix}`;
  }

  private error(code: DiagnosticCode, message: string, position: SourcePosition, suggestion?: string): void {
    this.diagnostics.push({ severity: "error", code, message, position, ...(suggestion ? { suggestion } : {}) });
  }
}
