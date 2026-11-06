import type { Diagnostic, SourcePosition } from "../diagnostics/Diagnostic.js";
import type { DiagnosticCode } from "../diagnostics/DiagnosticCodes.js";
import { closestMatch, didYouMean } from "../diagnostics/suggest.js";
import type { ShapeDefinition } from "../registry/ShapeDefinition.js";
import type { ParamDefinition, ParamType } from "../registry/ParamDefinition.js";
import { GROUP_DEFINITION } from "../registry/shapes.config.js";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MAX_STATEMENTS_PER_PROGRAM,
  DEFAULT_EXECUTION_LIMITS,
  type ExecutionLimits,
} from "../config/compiler.config.js";
import type { Span } from "../ast/Span.js";
import type { ProgramNode } from "../ast/nodes/ProgramNode.js";
import { CommandCallNode } from "../ast/nodes/CommandCallNode.js";
import type { ArgumentNode } from "../ast/nodes/ArgumentNode.js";
import type { AssignmentNode } from "../ast/nodes/AssignmentNode.js";
import type {
  BlockNode,
  ForNode,
  FunctionDeclNode,
  GroupNode,
  IfNode,
  ReturnNode,
  StatementNode,
  VariableDeclNode,
} from "../ast/nodes/StatementNode.js";
import {
  IdentifierValueNode,
  type BinaryExprNode,
  type ExpressionNode,
  type HexColorLiteralNode,
  type IValueVisitor,
  type NumberLiteralNode,
  type StringLiteralNode,
  type UnaryExprNode,
  type ValueNode,
} from "../ast/nodes/ValueNode.js";
import { walkExpression, walkStatements } from "../ast/walk.js";
import type { IShapeRegistry } from "./ShapeRegistry.js";
import type { ColorResolver } from "./ColorResolver.js";
import { BUILTINS_BY_NAME, cleanNumber, type BuiltinFunction } from "./builtins.js";
import type {
  ParamOrigin,
  ParamValue,
  ResolvedConnection,
  ResolvedGroup,
  ResolvedShape,
  Scene,
  SourceOrigin,
} from "./Scene.js";

export interface SemanticAnalysisResult {
  readonly scene: Scene;
  readonly diagnostics: readonly Diagnostic[];
}

export interface AnalysisOptions {
  readonly limits?: Partial<ExecutionLimits>;
  /** Polled while the program runs; return true to abort (SEM-026). */
  readonly isCancelled?: () => boolean;
  /** Wall-clock budget in ms, on top of the deterministic step budget. */
  readonly deadlineMs?: number;
}

// ---- runtime values ----

type Value =
  | { readonly t: "num"; readonly v: number }
  | { readonly t: "str"; readonly v: string }
  | { readonly t: "color"; readonly v: string }
  | { readonly t: "shape"; readonly id: string }
  | { readonly t: "void" };

const VOID: Value = { t: "void" };
const num = (v: number): Value => ({ t: "num", v });

const TYPE_NAMES: Readonly<Record<Value["t"], string>> = {
  num: "número",
  str: "texto",
  color: "color",
  shape: "figura",
  void: "nada",
};

const GIVEN_DESCRIPTIONS: Readonly<Record<Value["t"], string>> = {
  num: "un número",
  str: "una cadena de texto",
  color: "un color",
  shape: "una figura",
  void: "nada",
};

const truthy = (value: Value): boolean => {
  switch (value.t) {
    case "num":
      return value.v !== 0;
    case "str":
      return value.v !== "";
    case "void":
      return false;
    default:
      return true;
  }
};

// ---- scopes ----

type BindingKind = "const" | "let" | "param" | "shape";

interface Binding {
  value: Value;
  readonly kind: BindingKind;
}

class Scope {
  private readonly bindings = new Map<string, Binding>();

  constructor(public readonly parent: Scope | null = null) {}

  lookup(name: string): Binding | undefined {
    return this.bindings.get(name) ?? this.parent?.lookup(name);
  }

  lookupLocal(name: string): Binding | undefined {
    return this.bindings.get(name);
  }

  declare(name: string, value: Value, kind: BindingKind): void {
    this.bindings.set(name, { value, kind });
  }

  /** Every name visible from here (for "did you mean" hints). */
  visibleNames(): string[] {
    return [...this.bindings.keys(), ...(this.parent?.visibleNames() ?? [])];
  }

  visibleShapeNames(): string[] {
    const own = [...this.bindings].filter(([, binding]) => binding.kind === "shape").map(([name]) => name);
    return [...own, ...(this.parent?.visibleShapeNames() ?? [])];
  }
}

/** Thrown when a resource limit is hit: unlike an ordinary error it stops the whole program. */
class LimitExceeded extends Error {
  constructor(
    public readonly code: DiagnosticCode,
    message: string,
    public readonly position: SourcePosition,
    public readonly suggestion?: string,
  ) {
    super(message);
  }
}

/** `undefined` from a statement = keep going; an object = a `retornar` is unwinding the call. */
type Flow = { readonly value: Value } | undefined;

type ArgOutcome = { ok: true; value: ParamValue } | { ok: false };

type MutableOrigin = { -readonly [K in keyof SourceOrigin]: SourceOrigin[K] };

interface SiteInfo {
  readonly site: number;
  readonly dynamic: boolean;
}

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

const clock: { now(): number } = (globalThis as { performance?: { now(): number } }).performance ?? Date;

/**
 * Validates the AST and *runs* it, lowering the result into a Scene (the IR
 * the CodeGenerator draws from). The language has variables, expressions,
 * loops, functions and groups, so "analysis" means controlled execution:
 *
 *  - lexical scopes (blocks, loops, function bodies);
 *  - every loop iteration, call and emitted element is metered (see
 *    ExecutionLimits), so no program can hang the browser or the backend;
 *  - nothing is `eval`ed: the interpreter walks the AST and only knows the
 *    operations listed in docs/grammar.md.
 *
 * Implements IValueVisitor because expressions are the one place in the AST
 * that vary in shape (ADR 0002).
 */
export class SemanticAnalyzer implements IValueVisitor<Value | undefined> {
  private readonly diagnostics: Diagnostic[] = [];
  private readonly seenDiagnostics = new Set<string>();
  private readonly shapes: ResolvedShape[] = [];
  private readonly connections: ResolvedConnection[] = [];
  private readonly groups: ResolvedGroup[] = [];
  private readonly usedIds = new Set<string>();
  private readonly functions = new Map<string, FunctionDeclNode>();
  private readonly topLevelFunctions = new Set<FunctionDeclNode>();
  private readonly sites = new Map<object, SiteInfo>();
  private readonly siteOrigins = new Map<object, MutableOrigin>();
  private readonly instanceCounters = new Map<number, number>();
  private readonly groupStack: string[] = [];
  private readonly limits: ExecutionLimits;
  private readonly globalScope = new Scope();
  private scope: Scope = this.globalScope;
  private steps = 0;
  private callDepth = 0;
  private startedAt = 0;

  constructor(
    private readonly registry: IShapeRegistry,
    private readonly colorResolver: ColorResolver,
    private readonly options: AnalysisOptions = {},
  ) {
    this.limits = { ...DEFAULT_EXECUTION_LIMITS, ...options.limits };
  }

  public analyze(program: ProgramNode): SemanticAnalysisResult {
    let statementCount = 0;
    walkStatements(program.statements, () => {
      statementCount += 1;
    });
    if (statementCount > MAX_STATEMENTS_PER_PROGRAM) {
      this.error(
        "SEM-001",
        `El programa excede el máximo de ${MAX_STATEMENTS_PER_PROGRAM} instrucciones.`,
        { line: 1, column: 1 },
        "Divide el diagrama en partes más pequeñas.",
      );
      return this.buildResult();
    }

    this.startedAt = clock.now();
    this.indexSites(program.statements, false);
    this.hoistFunctions(program.statements);

    try {
      this.executeStatements(program.statements, this.globalScope);
    } catch (error) {
      if (!(error instanceof LimitExceeded)) throw error;
      this.error(error.code, error.message, error.position, error.suggestion);
    }
    return this.buildResult();
  }

  private buildResult(): SemanticAnalysisResult {
    // Origins are shared by every instance of a call site; now that the run is over, say how many there were.
    for (const origin of this.siteOrigins.values()) origin.instances = this.instanceCounters.get(origin.site) ?? 0;
    return {
      scene: {
        canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        shapes: this.shapes,
        connections: this.connections,
        ...(this.groups.length > 0 ? { groups: this.groups } : {}),
      },
      diagnostics: this.diagnostics,
    };
  }

  // ---- source sites (stable identity for shapes) ----

  /** Numbers every call and group in source order; marks the ones inside loops/functions as dynamic. */
  private indexSites(statements: readonly StatementNode[], dynamic: boolean): void {
    const indexExpression = (node: ValueNode | null, isDynamic: boolean): void => {
      if (!node) return;
      walkExpression(node, (child) => {
        if (child instanceof CommandCallNode) this.registerSite(child, isDynamic);
      });
    };
    for (const statement of statements) {
      if (statement instanceof CommandCallNode) {
        indexExpression(statement, dynamic);
        continue;
      }
      switch (statement.kind) {
        case "assignment":
          indexExpression(statement.value, dynamic);
          break;
        case "variableDecl":
          indexExpression(statement.init, dynamic);
          break;
        case "functionDecl":
          this.indexSites(statement.body.statements, true);
          break;
        case "for":
          if (statement.init) this.indexSites([statement.init], dynamic);
          indexExpression(statement.condition, true);
          if (statement.update) this.indexSites([statement.update], true);
          this.indexSites(statement.body.statements, true);
          break;
        case "if":
          indexExpression(statement.condition, dynamic);
          this.indexSites(statement.thenBlock.statements, dynamic);
          if (statement.elseBranch) this.indexSites([statement.elseBranch], dynamic);
          break;
        case "group":
          this.registerSite(statement, dynamic);
          for (const arg of statement.args) indexExpression(arg.value, dynamic);
          this.indexSites(statement.body.statements, dynamic);
          break;
        case "block":
          this.indexSites(statement.statements, dynamic);
          break;
        case "return":
          indexExpression(statement.value, dynamic);
          break;
      }
    }
  }

  private registerSite(node: object, dynamic: boolean): void {
    this.sites.set(node, { site: this.sites.size, dynamic });
  }

  private nextInstance(site: number): number {
    const instance = this.instanceCounters.get(site) ?? 0;
    this.instanceCounters.set(site, instance + 1);
    return instance;
  }

  // ---- declarations that must be visible before execution ----

  private hoistFunctions(statements: readonly StatementNode[]): void {
    for (const statement of statements) {
      if (statement instanceof CommandCallNode || statement.kind !== "functionDecl") continue;
      this.topLevelFunctions.add(statement);
      if (this.isReservedName(statement.name) || this.functions.has(statement.name)) {
        this.error(
          "SEM-018",
          `El nombre '${statement.name}' ya está en uso (comando, función matemática o función propia).`,
          statement.position,
          `Elige otro nombre para la función, por ejemplo '${statement.name}_2'.`,
        );
        continue;
      }
      const seen = new Set<string>();
      for (const param of statement.params) {
        if (seen.has(param.name)) {
          this.error("SEM-017", `El parámetro '${param.name}' está repetido.`, param.position, "Usa nombres distintos.");
        }
        seen.add(param.name);
      }
      this.functions.set(statement.name, statement);
    }
  }

  private isReservedName(name: string): boolean {
    return this.registry.has(name) || BUILTINS_BY_NAME.has(name);
  }

  // ---- statements ----

  private executeStatements(statements: readonly StatementNode[], scope: Scope): Flow {
    const previous = this.scope;
    this.scope = scope;
    try {
      for (const statement of statements) {
        const flow = this.executeStatement(statement);
        if (flow) return flow;
      }
      return undefined;
    } finally {
      this.scope = previous;
    }
  }

  private executeStatement(statement: StatementNode): Flow {
    this.step(statement.position);
    if (statement instanceof CommandCallNode) {
      this.callAny(statement, undefined);
      return undefined;
    }
    switch (statement.kind) {
      case "assignment":
        this.executeAssignment(statement);
        return undefined;
      case "variableDecl":
        this.executeVariableDecl(statement);
        return undefined;
      case "functionDecl":
        if (!this.topLevelFunctions.has(statement)) {
          this.error(
            "SEM-028",
            `La función '${statement.name}' debe declararse en el nivel superior.`,
            statement.position,
            "Mueve 'funcion' fuera de bucles, condiciones, grupos y otras funciones.",
          );
        }
        return undefined;
      case "for":
        return this.executeFor(statement);
      case "if":
        return this.executeIf(statement);
      case "group":
        return this.executeGroup(statement);
      case "block":
        return this.executeStatements(statement.statements, new Scope(this.scope));
      case "return":
        return this.executeReturn(statement);
    }
  }

  private executeVariableDecl(node: VariableDeclNode): void {
    if (!this.checkNameFree(node.name, node.position)) return;
    const value = this.evaluate(node.init);
    if (value === undefined) return;
    this.scope.declare(node.name, value, node.mutable ? "let" : "const");
  }

  /** A new name must not shadow a command/function nor repeat one in the same scope. */
  private checkNameFree(name: string, position: SourcePosition): boolean {
    if (this.isReservedName(name) || this.functions.has(name)) {
      this.error(
        "SEM-018",
        `El nombre '${name}' ya está en uso (comando, función matemática o función propia).`,
        position,
        `Elige otro nombre, por ejemplo '${name}_2'.`,
      );
      return false;
    }
    const existing = this.scope.lookupLocal(name);
    if (existing) {
      if (existing.kind === "shape") {
        this.error(
          "SEM-002",
          `El identificador '${name}' ya fue declarado.`,
          position,
          `Usa otro nombre, por ejemplo '${this.freeIdentifier(name)}'.`,
        );
      } else {
        this.error(
          "SEM-017",
          `'${name}' ya está declarado en este ámbito.`,
          position,
          `Usa otro nombre, por ejemplo '${this.freeIdentifier(name)}', o asigna con '${name} = ...' si es una variable 'let'.`,
        );
      }
      return false;
    }
    return true;
  }

  private executeAssignment(node: AssignmentNode): void {
    const call = node.value instanceof CommandCallNode ? node.value : null;
    const definition = call ? this.registry.get(call.name) : undefined;

    if (call && definition) {
      this.bindShape(node, call, definition);
      return;
    }
    // `x = nombre_inexistente(...)`: report the unknown command, not a missing variable.
    if (call && !BUILTINS_BY_NAME.has(call.name) && !this.functions.has(call.name)) {
      this.callAny(call, undefined);
      return;
    }

    const binding = this.scope.lookup(node.identifier);
    if (!binding) {
      this.error(
        "SEM-015",
        `La variable '${node.identifier}' no está declarada.`,
        node.position,
        didYouMean(closestMatch(node.identifier, this.scope.visibleNames())) ??
          `Declárala antes con 'let ${node.identifier} = ...;'.`,
      );
      return;
    }
    if (binding.kind === "const" || binding.kind === "shape") {
      this.error(
        "SEM-016",
        `'${node.identifier}' es ${binding.kind === "const" ? "una constante" : "una figura"} y no puede reasignarse.`,
        node.position,
        binding.kind === "const" ? "Declárala con 'let' si necesitas cambiar su valor." : "Crea otra figura con otro nombre.",
      );
      return;
    }
    const value = this.evaluate(node.value);
    if (value !== undefined) binding.value = value;
  }

  /** `id = crear_xxx(...)`: runs the command and names the resulting shape. */
  private bindShape(node: AssignmentNode, call: CommandCallNode, definition: ShapeDefinition): void {
    if (!this.checkNameFree(node.identifier, node.position)) return;
    const result = this.executeShapeCall(call, definition, node.identifier, node.span);
    if (result === undefined) return;
    if (definition.category !== "shape" || result.t !== "shape") {
      this.error(
        "SEM-003",
        `El comando '${call.name}' no puede asignarse a un identificador.`,
        node.position,
        `Quita '${node.identifier} =' y deja solo ${call.name}(...).`,
      );
      return;
    }
    this.scope.declare(node.identifier, result, "shape");
  }

  private executeFor(node: ForNode): Flow {
    const loopScope = new Scope(this.scope);
    if (node.init) {
      const flow = this.executeStatements([node.init], loopScope);
      if (flow) return flow;
    }
    let iterations = 0;
    for (;;) {
      if (node.condition) {
        const condition = this.evaluateIn(node.condition, loopScope);
        if (condition === undefined || !truthy(condition)) return undefined;
      }
      iterations += 1;
      if (iterations > this.limits.maxLoopIterations) {
        throw new LimitExceeded(
          "SEM-022",
          `El bucle superó el máximo de ${this.limits.maxLoopIterations} iteraciones.`,
          node.position,
          "Revisa la condición del 'para': puede que nunca se cumpla la salida.",
        );
      }
      this.step(node.position);
      const diagnosticsBefore = this.diagnostics.length;
      const flow = this.executeStatements(node.body.statements, new Scope(loopScope));
      if (flow) return flow;
      // One broken iteration would repeat the same error thousands of times: stop at the first.
      if (this.diagnostics.length > diagnosticsBefore) return undefined;
      if (node.update) {
        const updateFlow = this.executeStatements([node.update], loopScope);
        if (updateFlow) return updateFlow;
      }
    }
  }

  private executeIf(node: IfNode): Flow {
    const condition = this.evaluate(node.condition);
    if (condition === undefined) return undefined;
    if (truthy(condition)) return this.executeStatements(node.thenBlock.statements, new Scope(this.scope));
    if (!node.elseBranch) return undefined;
    return node.elseBranch.kind === "if"
      ? this.executeIf(node.elseBranch)
      : this.executeStatements((node.elseBranch as BlockNode).statements, new Scope(this.scope));
  }

  private executeGroup(node: GroupNode): Flow {
    const resolved = this.resolveArguments("grupo", node.args, GROUP_DEFINITION, node.position, "el grupo");
    if (!resolved) return undefined;

    const siteInfo = this.sites.get(node);
    const instance = siteInfo ? this.nextInstance(siteInfo.site) : 0;
    const id = this.uniqueId(`grupo@${siteInfo?.site ?? 0}${siteInfo?.dynamic ? `.${instance}` : ""}`);
    const parentId = this.groupStack[this.groupStack.length - 1];
    this.groups.push({
      id,
      ...(parentId ? { parentId } : {}),
      params: resolved.params as Readonly<Record<string, number>>,
      origin: this.originFor(node, node.span, node.span, this.appendPoint(node.args, node.closeOffset), resolved.origins, siteInfo),
    });

    this.groupStack.push(id);
    try {
      return this.executeStatements(node.body.statements, new Scope(this.scope));
    } finally {
      this.groupStack.pop();
    }
  }

  private executeReturn(node: ReturnNode): Flow {
    if (this.callDepth === 0) {
      this.error("SEM-027", "'retornar' solo puede usarse dentro de una función.", node.position, "Quita 'retornar' o muévelo dentro de 'funcion'.");
      return undefined;
    }
    if (!node.value) return { value: VOID };
    const value = this.evaluate(node.value);
    return { value: value ?? VOID };
  }

  // ---- calls ----

  private callAny(call: CommandCallNode, bindName: string | undefined): Value | undefined {
    this.step(call.position);
    const builtin = BUILTINS_BY_NAME.get(call.name);
    if (builtin) return this.callBuiltin(builtin, call);

    const definition = this.registry.get(call.name);
    if (definition) return this.executeShapeCall(call, definition, bindName);

    const userFunction = this.functions.get(call.name);
    if (userFunction) return this.callUser(userFunction, call);

    const names = [...this.registry.all().map((candidate) => candidate.name), ...BUILTINS_BY_NAME.keys(), ...this.functions.keys()];
    this.error(
      "SEM-004",
      `Comando desconocido: '${call.name}'.`,
      call.position,
      didYouMean(closestMatch(call.name, names)) ?? `Comandos disponibles: ${names.join(", ")}.`,
    );
    return undefined;
  }

  private callBuiltin(builtin: BuiltinFunction, call: CommandCallNode): Value | undefined {
    if (call.args.some((arg) => arg.name !== null)) {
      this.error("SEM-019", `'${builtin.name}' solo acepta argumentos posicionales.`, call.position, `Escribe ${builtin.name}(valor).`);
      return undefined;
    }
    const count = call.args.length;
    if (count < builtin.minArgs || count > builtin.maxArgs) {
      const expected =
        builtin.maxArgs === Infinity
          ? `al menos ${builtin.minArgs}`
          : builtin.minArgs === builtin.maxArgs
            ? String(builtin.minArgs)
            : `${builtin.minArgs} a ${builtin.maxArgs}`;
      this.error("SEM-019", `'${builtin.name}' espera ${expected} argumento(s) y recibió ${count}.`, call.position);
      return undefined;
    }
    const values: number[] = [];
    for (const arg of call.args) {
      const value = this.evaluate(arg.value);
      if (value === undefined) return undefined;
      if (value.t !== "num") {
        this.error("SEM-021", `'${builtin.name}' espera números, pero recibió ${GIVEN_DESCRIPTIONS[value.t]}.`, arg.value.position);
        return undefined;
      }
      values.push(value.v);
    }
    const result = builtin.run(values);
    if (!Number.isFinite(result)) {
      this.error("SEM-030", `${builtin.name}(${values.join(", ")}) no es un número real.`, call.position, "Revisa el valor que pasas a la función.");
      return undefined;
    }
    return num(cleanNumber(result));
  }

  private callUser(fn: FunctionDeclNode, call: CommandCallNode): Value | undefined {
    if (this.callDepth >= this.limits.maxCallDepth) {
      throw new LimitExceeded(
        "SEM-023",
        `Las llamadas anidadas superaron la profundidad máxima (${this.limits.maxCallDepth}).`,
        call.position,
        `Revisa la recursión de '${fn.name}': necesita un caso base que la detenga.`,
      );
    }
    const paramNames = fn.params.map((param) => param.name);
    const matched = this.matchArguments(call.name, paramNames, call.args, "la función", call.position);
    if (!matched) return undefined;

    const fnScope = new Scope(this.globalScope);
    let hasError = false;
    for (const param of fn.params) {
      const arg = matched.get(param.name);
      if (!arg) {
        this.error(
          "SEM-009",
          `Falta el parámetro requerido '${param.name}' en '${call.name}'.`,
          call.position,
          `'${call.name}' recibe: ${paramNames.join(", ")}.`,
        );
        hasError = true;
        continue;
      }
      const value = this.evaluate(arg.value);
      if (value === undefined) {
        hasError = true;
        continue;
      }
      fnScope.declare(param.name, value, "param");
    }
    if (hasError) return undefined;

    this.callDepth += 1;
    try {
      const flow = this.executeStatements(fn.body.statements, fnScope);
      return flow?.value ?? VOID;
    } finally {
      this.callDepth -= 1;
    }
  }

  // ---- shape commands ----

  private executeShapeCall(
    call: CommandCallNode,
    definition: ShapeDefinition,
    bindName: string | undefined,
    statementSpan?: Span,
  ): Value | undefined {
    const resolved = this.resolveArguments(call.name, call.args, definition, call.position, "el comando");
    if (!resolved) return undefined;
    const siteInfo = this.sites.get(call);
    const origin = this.originFor(
      call,
      call.span,
      statementSpan ?? call.span,
      this.appendPoint(call.args, call.span.end - 1),
      resolved.origins,
      siteInfo,
    );

    if (definition.category === "connection") {
      if (this.connections.length >= this.limits.maxShapes) this.tooManyElements(call.position);
      const { origen, destino, ...renderParams } = resolved.params;
      this.connections.push({ fromId: String(origen), toId: String(destino), params: renderParams, origin });
      return VOID;
    }

    if (this.shapes.length >= this.limits.maxShapes) this.tooManyElements(call.position);
    const instance = siteInfo ? this.nextInstance(siteInfo.site) : 0;
    const dynamic = siteInfo?.dynamic ?? false;
    const base = bindName ?? (dynamic ? call.name : `__shape_${this.shapes.length}`);
    const id = this.uniqueId(dynamic ? `${base}@${siteInfo?.site ?? 0}.${instance}` : base, `@${siteInfo?.site ?? 0}`);
    const groupId = this.groupStack[this.groupStack.length - 1];
    this.shapes.push({
      id,
      kind: call.name,
      params: resolved.params,
      ...(groupId ? { groupId } : {}),
      origin,
      instance,
    });
    return { t: "shape", id };
  }

  private tooManyElements(position: SourcePosition): never {
    throw new LimitExceeded(
      "SEM-024",
      `La escena superó el máximo de ${this.limits.maxShapes} elementos.`,
      position,
      "Reduce las repeticiones de tus bucles o la profundidad de la recursión.",
    );
  }

  /** An id nobody used yet; falls back to `<candidate><suffix>` then a counter. */
  private uniqueId(candidate: string, suffix = "~"): string {
    let id = candidate;
    if (this.usedIds.has(id)) id = `${candidate}${suffix}`;
    let counter = 2;
    while (this.usedIds.has(id)) {
      id = `${candidate}${suffix}${counter}`;
      counter += 1;
    }
    this.usedIds.add(id);
    return id;
  }

  /** Where `name=value` goes when a parameter was left to its default: after the last argument, else before the ')'. */
  private appendPoint(args: readonly ArgumentNode[], closeOffset: number): { appendAt: number; hasArgs: boolean } {
    const last = args.at(-1);
    return last ? { appendAt: last.span.end, hasArgs: true } : { appendAt: closeOffset, hasArgs: false };
  }

  private originFor(
    node: object,
    callSpan: Span,
    statementSpan: Span,
    append: { appendAt: number; hasArgs: boolean },
    params: Record<string, ParamOrigin>,
    siteInfo: SiteInfo | undefined,
  ): MutableOrigin {
    const cached = this.siteOrigins.get(node);
    if (cached) return cached;
    const origin: MutableOrigin = {
      site: siteInfo?.site ?? 0,
      callSpan,
      statementSpan,
      ...append,
      dynamic: siteInfo?.dynamic ?? false,
      instances: 0,
      params,
    };
    this.siteOrigins.set(node, origin);
    return origin;
  }

  /**
   * Matches written arguments to parameters (positional first, then named),
   * evaluates them and type-checks each against its definition.
   */
  private resolveArguments(
    name: string,
    args: readonly ArgumentNode[],
    definition: ShapeDefinition,
    position: SourcePosition,
    label: string,
  ): { params: Record<string, ParamValue>; origins: Record<string, ParamOrigin> } | null {
    const matched = this.matchArguments(
      name,
      definition.params.map((param) => param.name),
      args,
      label,
      position,
    );
    let hasError = matched === null;
    const params: Record<string, ParamValue> = {};
    const origins: Record<string, ParamOrigin> = {};

    for (const paramDef of definition.params) {
      const arg = matched?.get(paramDef.name);
      if (arg === undefined) {
        if (matched === null) continue;
        if (paramDef.required) {
          this.error(
            "SEM-009",
            `Falta el parámetro requerido '${paramDef.name}' en '${name}'.`,
            position,
            `Agrega ${paramDef.name}=${EXAMPLE_VALUES[paramDef.type]} dentro de los paréntesis.`,
          );
          hasError = true;
          continue;
        }
        params[paramDef.name] = paramDef.defaultValue as ParamValue;
        origins[paramDef.name] = { editability: "default" };
        continue;
      }

      const outcome = this.evaluateForParam(arg.value, paramDef);
      if (!outcome.ok) {
        hasError = true;
        continue;
      }
      params[paramDef.name] = outcome.value;
      origins[paramDef.name] = this.classify(arg.value);
    }
    return hasError ? null : { params, origins };
  }

  /** Same rules for shape commands, groups and user functions. Returns null (after reporting) on a bad argument list. */
  private matchArguments(
    name: string,
    paramNames: readonly string[],
    args: readonly ArgumentNode[],
    label: string,
    position: SourcePosition,
  ): Map<string, ArgumentNode> | null {
    void position;
    const matched = new Map<string, ArgumentNode>();
    let namedSeen = false;
    let positionalIndex = 0;
    let hasError = false;

    for (const arg of args) {
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
        const paramName = paramNames[positionalIndex];
        if (paramName === undefined) {
          this.error(
            "SEM-006",
            `${capitalize(label)} '${name}' no acepta más argumentos posicionales.`,
            arg.position,
            `'${name}' recibe: ${paramNames.join(", ")}.`,
          );
          hasError = true;
          continue;
        }
        if (matched.has(paramName)) {
          this.error("SEM-007", `Argumento duplicado: '${paramName}'.`, arg.position, DUPLICATE_HINT);
          hasError = true;
          continue;
        }
        matched.set(paramName, arg);
        positionalIndex += 1;
      } else {
        namedSeen = true;
        if (!paramNames.includes(arg.name)) {
          this.error(
            "SEM-008",
            `Parámetro desconocido '${arg.name}' para ${label} '${name}'.`,
            arg.position,
            didYouMean(closestMatch(arg.name, paramNames)) ?? `'${name}' acepta: ${paramNames.join(", ")}.`,
          );
          hasError = true;
          continue;
        }
        if (matched.has(arg.name)) {
          this.error("SEM-007", `Argumento duplicado: '${arg.name}'.`, arg.position, DUPLICATE_HINT);
          hasError = true;
          continue;
        }
        matched.set(arg.name, arg);
      }
    }
    return hasError ? null : matched;
  }

  /** Literal vs computed: what a visual editor may safely rewrite. */
  private classify(node: ValueNode): ParamOrigin {
    const kind = (node as ExpressionNode).kind;
    const isLiteral =
      kind === "number" ||
      kind === "string" ||
      kind === "hexColor" ||
      (node instanceof IdentifierValueNode && this.isContextualWord(node));
    if (isLiteral) return { editability: "literal", span: node.span };

    const dependsOn = new Set<string>();
    walkExpression(node, (child) => {
      if (child instanceof IdentifierValueNode) dependsOn.add(child.name);
    });
    return { editability: "expression", span: node.span, dependsOn: [...dependsOn] };
  }

  /** A bare word that is not a variable (`rojo`, `flecha`): a literal in disguise. */
  private isContextualWord(node: IdentifierValueNode): boolean {
    return this.scope.lookup(node.name) === undefined;
  }

  // ---- arguments & type checks ----

  private evaluateForParam(node: ValueNode, param: ParamDefinition): ArgOutcome {
    this.step(node.position);
    if (node instanceof IdentifierValueNode) return this.resolveIdentifierArgument(node, param);

    const value = this.evaluate(node);
    if (value === undefined) return { ok: false };
    return this.coerce(value, param, node.position);
  }

  /**
   * A bare identifier argument. Variables win; otherwise the parameter's type
   * decides what the word means (color name / enum word / shape name) — the
   * same contextual rule the language always had.
   */
  private resolveIdentifierArgument(node: IdentifierValueNode, param: ParamDefinition): ArgOutcome {
    const binding = this.scope.lookup(node.name);
    if (binding && this.valueFits(binding.value, param)) return this.coerce(binding.value, param, node.position);

    switch (param.type) {
      case "color": {
        const hex = this.colorResolver.resolve(node.name);
        if (hex !== undefined) return { ok: true, value: hex };
        if (binding) return this.coerce(binding.value, param, node.position);
        const colors = this.colorResolver.names();
        this.error(
          "SEM-012",
          `Color desconocido: '${node.name}'.`,
          node.position,
          didYouMean(closestMatch(node.name, [...colors, ...this.scope.visibleNames()])) ??
            `Usa un color con nombre (${colors.join(", ")}) o un hexadecimal como #ff8800.`,
        );
        return { ok: false };
      }
      case "shapeRef": {
        if (binding) return this.coerce(binding.value, param, node.position);
        this.error(
          "SEM-013",
          `Referencia a una figura no declarada: '${node.name}'.`,
          node.position,
          didYouMean(closestMatch(node.name, this.scope.visibleShapeNames())) ??
            `Declara la figura antes, por ejemplo: ${node.name} = crear_circulo(radio=20, x=100, y=100);`,
        );
        return { ok: false };
      }
      case "string": {
        if (binding) return this.coerce(binding.value, param, node.position);
        if (param.allowedValues && param.allowedValues.includes(node.name)) return { ok: true, value: node.name };
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
      default: {
        if (binding) return this.coerce(binding.value, param, node.position);
        if (this.colorResolver.resolve(node.name) !== undefined) {
          this.typeError(param, "un color", node.position);
          return { ok: false };
        }
        this.undefinedVariable(node);
        return { ok: false };
      }
    }
  }

  private valueFits(value: Value, param: ParamDefinition): boolean {
    switch (param.type) {
      case "number":
        return value.t === "num";
      case "string":
        return value.t === "str";
      case "color":
        return value.t === "color";
      case "shapeRef":
        return value.t === "shape";
    }
  }

  private coerce(value: Value, param: ParamDefinition, position: SourcePosition): ArgOutcome {
    if (!this.valueFits(value, param)) {
      this.typeError(param, GIVEN_DESCRIPTIONS[value.t], position);
      return { ok: false };
    }
    if (value.t === "shape") return { ok: true, value: value.id };
    if (value.t === "num") return { ok: true, value: value.v };
    if (value.t === "void") return { ok: false };
    if (param.type === "string" && param.allowedValues && !param.allowedValues.includes(value.v)) {
      this.notAllowed(param.name, param.allowedValues, value.v, position);
      return { ok: false };
    }
    return { ok: true, value: value.v };
  }

  // ---- expression evaluation (visitor) ----

  /** Evaluates an expression that must produce a value. */
  private evaluate(node: ValueNode): Value | undefined {
    const value = node.accept(this);
    if (value?.t === "void") {
      const name = node instanceof CommandCallNode ? `'${node.name}' ` : "";
      this.error("SEM-029", `La función ${name}no devuelve ningún valor.`, node.position, "Agrega 'retornar valor;' dentro de la función.");
      return undefined;
    }
    return value;
  }

  private evaluateIn(node: ValueNode, scope: Scope): Value | undefined {
    const previous = this.scope;
    this.scope = scope;
    try {
      return this.evaluate(node);
    } finally {
      this.scope = previous;
    }
  }

  visitNumberLiteral(node: NumberLiteralNode): Value {
    return num(node.value);
  }

  visitStringLiteral(node: StringLiteralNode): Value {
    return { t: "str", v: node.value };
  }

  visitHexColorLiteral(node: HexColorLiteralNode): Value {
    return { t: "color", v: node.value };
  }

  visitIdentifierValue(node: IdentifierValueNode): Value | undefined {
    const binding = this.scope.lookup(node.name);
    if (binding) return binding.value;
    const hex = this.colorResolver.resolve(node.name);
    if (hex !== undefined) return { t: "color", v: hex };
    this.undefinedVariable(node);
    return undefined;
  }

  visitCall(node: CommandCallNode): Value | undefined {
    return this.callAny(node, undefined);
  }

  visitUnary(node: UnaryExprNode): Value | undefined {
    this.step(node.position);
    const operand = this.evaluate(node.operand);
    if (operand === undefined) return undefined;
    if (node.operator === "!") return num(truthy(operand) ? 0 : 1);
    if (operand.t !== "num") {
      this.error("SEM-021", `No se puede negar ${GIVEN_DESCRIPTIONS[operand.t]}.`, node.position, "El signo '-' solo se aplica a números.");
      return undefined;
    }
    return num(cleanNumber(-operand.v));
  }

  visitBinary(node: BinaryExprNode): Value | undefined {
    this.step(node.position);
    const left = this.evaluate(node.left);
    if (left === undefined) return undefined;

    // Short-circuit: the right side only runs when it can change the result.
    if (node.operator === "&&" || node.operator === "||") {
      const leftTruthy = truthy(left);
      if (node.operator === "&&" ? !leftTruthy : leftTruthy) return num(leftTruthy ? 1 : 0);
      const right = this.evaluate(node.right);
      return right === undefined ? undefined : num(truthy(right) ? 1 : 0);
    }

    const right = this.evaluate(node.right);
    if (right === undefined) return undefined;
    const op = node.operator;

    if (op === "==" || op === "!=") {
      const equal = left.t === right.t && JSON.stringify(left) === JSON.stringify(right);
      return num((op === "==") === equal ? 1 : 0);
    }

    if (op === "+" && (left.t === "str" || right.t === "str")) {
      const text = this.asText(left, node) + this.asText(right, node);
      if (text.length > this.limits.maxStringLength) {
        throw new LimitExceeded("SEM-024", `Un texto superó el máximo de ${this.limits.maxStringLength} caracteres.`, node.position);
      }
      return { t: "str", v: text };
    }

    if (left.t === "str" && right.t === "str" && (op === "<" || op === "<=" || op === ">" || op === ">=")) {
      return num(compare(op, left.v < right.v ? -1 : left.v > right.v ? 1 : 0));
    }

    if (left.t !== "num" || right.t !== "num") {
      this.error(
        "SEM-021",
        `No se puede usar '${op}' con ${TYPE_NAMES[left.t]} y ${TYPE_NAMES[right.t]}.`,
        node.position,
        "Los operadores aritméticos y de orden trabajan con números (y '+' también une textos).",
      );
      return undefined;
    }

    switch (op) {
      case "<":
      case "<=":
      case ">":
      case ">=":
        return num(compare(op, left.v - right.v));
      case "+":
        return this.finite(left.v + right.v, node);
      case "-":
        return this.finite(left.v - right.v, node);
      case "*":
        return this.finite(left.v * right.v, node);
      case "/":
      case "%":
        if (right.v === 0) {
          this.error("SEM-020", `División por cero (${op}).`, node.position, "Comprueba el divisor con 'si' antes de dividir.");
          return undefined;
        }
        return this.finite(op === "/" ? left.v / right.v : left.v % right.v, node);
      default:
        return undefined;
    }
  }

  private finite(value: number, node: BinaryExprNode): Value | undefined {
    if (!Number.isFinite(value)) {
      this.error("SEM-030", "El resultado de la operación no es un número finito.", node.position);
      return undefined;
    }
    return num(cleanNumber(value));
  }

  private asText(value: Value, node: BinaryExprNode): string {
    if (value.t === "str") return value.v;
    if (value.t === "num") return String(value.v);
    this.error("SEM-021", `No se puede unir ${TYPE_NAMES[value.t]} con texto.`, node.position);
    return "";
  }

  // ---- limits ----

  private step(position: SourcePosition): void {
    this.steps += 1;
    if (this.steps > this.limits.maxSteps) {
      throw new LimitExceeded(
        "SEM-025",
        `El programa superó el presupuesto de ejecución (${this.limits.maxSteps} pasos).`,
        position,
        "Simplifica los bucles anidados o la recursión.",
      );
    }
    if ((this.steps & 1023) === 1) {
      if (this.options.isCancelled?.()) {
        throw new LimitExceeded("SEM-026", "La compilación fue cancelada.", position);
      }
      if (this.options.deadlineMs !== undefined && clock.now() - this.startedAt > this.options.deadlineMs) {
        throw new LimitExceeded("SEM-025", `El programa tardó más de ${this.options.deadlineMs} ms en ejecutarse.`, position, "Simplifica el programa.");
      }
    }
  }

  // ---- diagnostics ----

  private undefinedVariable(node: IdentifierValueNode): void {
    const colors = this.colorResolver.names();
    this.error(
      "SEM-015",
      `La variable '${node.name}' no está definida.`,
      node.position,
      didYouMean(closestMatch(node.name, [...this.scope.visibleNames(), ...colors])) ??
        `Declárala antes, por ejemplo: const ${node.name} = 10;`,
    );
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
    const taken = new Set(this.scope.visibleNames());
    let suffix = 2;
    while (taken.has(`${base}${suffix}`)) suffix += 1;
    return `${base}${suffix}`;
  }

  /** Reports once per (code, place, message): a loop must not repeat one mistake thousands of times. */
  private error(code: DiagnosticCode, message: string, position: SourcePosition, suggestion?: string): void {
    const key = `${code}:${position.line}:${position.column}:${message}`;
    if (this.seenDiagnostics.has(key)) return;
    this.seenDiagnostics.add(key);
    this.diagnostics.push({ severity: "error", code, message, position, ...(suggestion ? { suggestion } : {}) });
  }
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** `op` applied to a three-way comparison result (negative / 0 / positive), as 1 or 0. */
function compare(op: "<" | "<=" | ">" | ">=", order: number): number {
  switch (op) {
    case "<":
      return order < 0 ? 1 : 0;
    case "<=":
      return order <= 0 ? 1 : 0;
    case ">":
      return order > 0 ? 1 : 0;
    case ">=":
      return order >= 0 ? 1 : 0;
  }
}
