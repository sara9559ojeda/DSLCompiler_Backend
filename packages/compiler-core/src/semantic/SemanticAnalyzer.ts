import type { Diagnostic, ShapeDefinition, SourcePosition } from "@compiler-img/shared";
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
        `El programa excede el máximo de ${MAX_STATEMENTS_PER_PROGRAM} instrucciones.`,
        { line: 1, column: 1 },
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
      this.error(`El identificador '${node.identifier}' ya fue declarado.`, node.position);
      return;
    }

    const resolved = this.resolveCommandCall(node.call);
    if (!resolved) return;

    if (resolved.definition.category !== "shape") {
      this.error(
        `El comando '${node.call.name}' no puede asignarse a un identificador.`,
        node.position,
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
      this.error(`Comando desconocido: '${call.name}'.`, call.position);
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
            "Los argumentos posicionales deben ir antes que los argumentos nombrados.",
            arg.position,
          );
          hasError = true;
          continue;
        }
        const paramDef = definition.params[positionalIndex];
        if (!paramDef) {
          this.error(
            `El comando '${call.name}' no acepta más argumentos posicionales.`,
            arg.position,
          );
          hasError = true;
          continue;
        }
        if (rawArgs.has(paramDef.name)) {
          this.error(`Argumento duplicado: '${paramDef.name}'.`, arg.position);
          hasError = true;
          continue;
        }
        rawArgs.set(paramDef.name, arg.value);
        positionalIndex += 1;
      } else {
        namedSeen = true;
        const paramDef = definition.params.find((p) => p.name === arg.name);
        if (!paramDef) {
          this.error(`Parámetro desconocido '${arg.name}' para el comando '${call.name}'.`, arg.position);
          hasError = true;
          continue;
        }
        if (rawArgs.has(arg.name)) {
          this.error(`Argumento duplicado: '${arg.name}'.`, arg.position);
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
          this.error(`Falta el parámetro requerido '${paramDef.name}' en '${call.name}'.`, call.position);
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
      this.error(`El parámetro '${param.name}' no admite un número.`, node.position);
      return { ok: false };
    }
    return { ok: true, value: node.value };
  }

  visitStringLiteral(node: StringLiteralNode): ValueOutcome {
    const param = this.activeParam!;
    if (param.type !== "string") {
      this.error(`El parámetro '${param.name}' no admite una cadena de texto.`, node.position);
      return { ok: false };
    }
    if (param.allowedValues && !param.allowedValues.includes(node.value)) {
      this.error(
        `Valor no permitido para '${param.name}': '${node.value}'. Valores válidos: ${param.allowedValues.join(", ")}.`,
        node.position,
      );
      return { ok: false };
    }
    return { ok: true, value: node.value };
  }

  visitHexColorLiteral(node: HexColorLiteralNode): ValueOutcome {
    const param = this.activeParam!;
    if (param.type !== "color") {
      this.error(`El parámetro '${param.name}' no admite un color.`, node.position);
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
          this.error(`Color desconocido: '${node.name}'.`, node.position);
          return { ok: false };
        }
        return { ok: true, value: hex };
      }
      case "shapeRef": {
        if (!this.symbolTable.has(node.name)) {
          this.error(`Referencia a una figura no declarada: '${node.name}'.`, node.position);
          return { ok: false };
        }
        return { ok: true, value: node.name };
      }
      case "string": {
        if (param.allowedValues && param.allowedValues.includes(node.name)) {
          return { ok: true, value: node.name };
        }
        if (param.allowedValues) {
          this.error(
            `Valor no permitido para '${param.name}': '${node.name}'. Valores válidos: ${param.allowedValues.join(", ")}.`,
            node.position,
          );
          return { ok: false };
        }
        this.error(`El parámetro '${param.name}' espera una cadena de texto entre comillas.`, node.position);
        return { ok: false };
      }
      default:
        this.error(`El parámetro '${param.name}' no admite un identificador.`, node.position);
        return { ok: false };
    }
  }

  private error(message: string, position: SourcePosition): void {
    this.diagnostics.push({ severity: "error", message, position });
  }
}
