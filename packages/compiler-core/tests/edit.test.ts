import { describe, expect, it } from "vitest";
import {
  applyChanges,
  createDefaultPipeline,
  handlesFor,
  moveParams,
  planEdit,
  resizeParams,
  toCanvasSpace,
  vectorToLocal,
  type EditRequest,
  type Scene,
} from "../src/index.js";

const pipeline = createDefaultPipeline();
const compile = (source: string): Scene => pipeline.compileWithStages(source).scene;

/** Plans an edit, applies it, recompiles and returns everything a test might want to look at. */
function edit(source: string, request: EditRequest) {
  const scene = compile(source);
  const plan = planEdit(source, scene, request);
  if (!plan.ok) return { plan, source, scene, next: scene, diagnostics: [] };
  const nextSource = applyChanges(source, plan.changes);
  const stages = pipeline.compileWithStages(nextSource);
  return { plan, source: nextSource, scene, next: stages.scene, diagnostics: stages.result.diagnostics };
}

const param = (scene: Scene, id: string, name: string) => scene.shapes.find((s) => s.id === id)!.params[name];

describe("editing literals in place", () => {
  const program = [
    "// Mi escena",
    "r1 = crear_rectangulo(ancho=80, alto=40, x=200, y=150, color=azul); // la caja",
    "",
    "c1 = crear_circulo(radio=50, x=100, y=100); // el sol",
    "conectar(c1, r1, tipo=flecha);",
    "",
  ].join("\n");

  it("moves a rectangle by rewriting only its x and y, keeping comments and neighbours untouched", () => {
    const { plan, source, next, diagnostics } = edit(program, { kind: "setParams", targetId: "r1", params: { x: 210, y: 140 } });
    expect(plan.ok).toBe(true);
    expect(diagnostics).toEqual([]);
    expect(source).toBe(program.replace("x=200, y=150", "x=210, y=140"));
    expect(param(next, "r1", "x")).toBe(210);
    expect(param(next, "r1", "y")).toBe(140);
    expect(param(next, "c1", "x")).toBe(100); // the other shape is untouched
  });

  it("changes the size and keeps the same shape ids (so the selection survives the recompile)", () => {
    const { scene, next } = edit(program, { kind: "setParams", targetId: "r1", params: { ancho: 120, alto: 60 } });
    expect(next.shapes.map((s) => s.id)).toEqual(scene.shapes.map((s) => s.id));
    expect(param(next, "r1", "ancho")).toBe(120);
  });

  it("writes a color back as its name when one matches, else as hex", () => {
    expect(edit(program, { kind: "setParams", targetId: "r1", params: { color: "#e53935" } }).source).toContain("color=rojo");
    expect(edit(program, { kind: "setParams", targetId: "r1", params: { color: "#AABBCC" } }).source).toContain("color=#aabbcc");
  });

  it("rounds to two decimals and never writes exponents or -0", () => {
    const { source } = edit(program, { kind: "setParams", targetId: "c1", params: { x: 100.12345, y: -0.001 } });
    expect(source).toContain("x=100.12, y=0");
  });

  it("is a no-op when the value does not change", () => {
    const plan = planEdit(program, compile(program), { kind: "setParams", targetId: "r1", params: { x: 200 } });
    expect(plan).toEqual({ ok: true, changes: [], summary: "Sin cambios." });
  });

  it("edits a negative literal in place", () => {
    const { source } = edit("c = crear_circulo(radio=5, x=-20, y=0);", { kind: "setParams", targetId: "c", params: { x: 30 } });
    expect(source).toBe("c = crear_circulo(radio=5, x=30, y=0);");
  });

  it("edits positional arguments in place", () => {
    const { source } = edit("conectar(a, b);\n".replace("conectar(a, b);\n", "a = crear_circulo(5, 10, 10);\n"), {
      kind: "setParams",
      targetId: "a",
      params: { x: 99 },
    });
    // 'radio, x, y' are required params written positionally.
    expect(source).toBe("a = crear_circulo(5, 99, 10);\n");
  });
});

describe("parameters left at their default", () => {
  it("appends opacidad after the last argument", () => {
    const { source, next, diagnostics } = edit("c = crear_circulo(radio=5, x=1, y=2); // nota", {
      kind: "setParams",
      targetId: "c",
      params: { opacidad: 0.5 },
    });
    expect(source).toBe("c = crear_circulo(radio=5, x=1, y=2, opacidad=0.5); // nota");
    expect(diagnostics).toEqual([]);
    expect(param(next, "c", "opacidad")).toBe(0.5);
  });

  it("combines several appended params, and a rewrite next to an append", () => {
    const { source } = edit("c = crear_circulo(radio=5, x=1, y=2);", {
      kind: "setParams",
      targetId: "c",
      params: { y: 7, color: "rojo", opacidad: 0.3 },
    });
    expect(source).toBe("c = crear_circulo(radio=5, x=1, y=7, color=rojo, opacidad=0.3);");
  });

  it("appends after the last argument of a multi-line call, not after the newline", () => {
    const program = "c = crear_circulo(\n  radio=5,\n  x=1,\n  y=2\n);";
    const { source, diagnostics } = edit(program, { kind: "setParams", targetId: "c", params: { opacidad: 0.5 } });
    expect(source).toBe("c = crear_circulo(\n  radio=5,\n  x=1,\n  y=2, opacidad=0.5\n);");
    expect(diagnostics).toEqual([]);
  });

  it("handles a group with an empty argument list", () => {
    const { source, next } = edit("grupo() { crear_circulo(radio=1, x=0, y=0); }", { kind: "setParams", targetId: "grupo@0", params: { x: 50 } });
    expect(source).toBe("grupo(x=50) { crear_circulo(radio=1, x=0, y=0); }");
    expect(next.groups![0]!.params.x).toBe(50);
  });
});

describe("refusing to guess", () => {
  const program = "const cx = 100;\nc = crear_circulo(radio=5, x=cx + 10, y=20);";

  it("won't replace an expression with a number, and says what it depends on", () => {
    const plan = planEdit(program, compile(program), { kind: "setParams", targetId: "c", params: { x: 50 } });
    expect(plan).toMatchObject({ ok: false, reason: "expression", dependsOn: ["cx"] });
    if (!plan.ok) expect(program.slice(plan.span!.start, plan.span!.end)).toBe("cx + 10");
  });

  it("still lets the literal parameters of the same shape be edited", () => {
    const { source } = edit(program, { kind: "setParams", targetId: "c", params: { y: 33 } });
    expect(source).toBe("const cx = 100;\nc = crear_circulo(radio=5, x=cx + 10, y=33);");
  });

  it("refuses shapes generated by a loop unless the user confirms", () => {
    const loop = "para (let i = 0; i < 3; i = i + 1) {\n  crear_circulo(radio=5, x=i * 50, y=20);\n}";
    const scene = compile(loop);
    const target = scene.shapes[1]!.id;
    const refused = planEdit(loop, scene, { kind: "setParams", targetId: target, params: { radio: 9 } });
    expect(refused).toMatchObject({ ok: false, reason: "shared", instances: 3 });

    const confirmed = edit(loop, { kind: "setParams", targetId: target, params: { radio: 9 }, allowShared: true });
    expect(confirmed.source).toContain("radio=9");
    expect(confirmed.next.shapes.every((s) => s.params.radio === 9)).toBe(true);
  });

  it("refuses a shape drawn by a function", () => {
    const program2 = "funcion punto(x) { crear_circulo(radio=5, x=x, y=0); }\npunto(10);";
    const scene = compile(program2);
    expect(planEdit(program2, scene, { kind: "setParams", targetId: scene.shapes[0]!.id, params: { radio: 9 } })).toMatchObject({
      ok: false,
      reason: "shared",
    });
  });

  it("validates values", () => {
    const scene = compile(program);
    const set = (params: Record<string, number | string>) => planEdit(program, scene, { kind: "setParams", targetId: "c", params });
    expect(set({ y: Number.NaN })).toMatchObject({ ok: false, reason: "invalid-value" });
    expect(set({ y: 1e9 })).toMatchObject({ ok: false, reason: "invalid-value" });
    expect(set({ opacidad: 2 })).toMatchObject({ ok: false, reason: "invalid-value" });
    expect(set({ radio: -3 })).toMatchObject({ ok: false, reason: "invalid-value" });
    expect(set({ color: "url(javascript:alert(1))" })).toMatchObject({ ok: false, reason: "invalid-value" });
    expect(set({ radio: "5" })).toMatchObject({ ok: false, reason: "invalid-value" });
    expect(set({ nope: 1 })).toMatchObject({ ok: false, reason: "unknown-param" });
  });

  it("rejects text that could break out of the string literal", () => {
    const text = 'crear_texto(contenido="hola", x=0, y=0);';
    const scene = compile(text);
    const id = scene.shapes[0]!.id;
    expect(planEdit(text, scene, { kind: "setParams", targetId: id, params: { contenido: 'a"); crear_circulo(radio=1' } })).toMatchObject({
      ok: false,
      reason: "invalid-value",
    });
    expect(edit(text, { kind: "setParams", targetId: id, params: { contenido: "adiós" } }).source).toBe('crear_texto(contenido="adiós", x=0, y=0);');
  });

  it("reports an unknown target", () => {
    expect(planEdit("", compile(""), { kind: "setParams", targetId: "nada", params: { x: 1 } })).toMatchObject({ ok: false, reason: "unknown-target" });
  });
});

describe("deleting", () => {
  const program = [
    "// escena",
    "a = crear_circulo(radio=5, x=10, y=10);",
    "b = crear_circulo(radio=5, x=50, y=10); // se queda",
    "conectar(a, b, tipo=flecha);",
    "crear_texto(contenido=\"fin\", x=0, y=0);",
    "",
  ].join("\n");

  it("removes the statement, its line, and the connections that used it", () => {
    const { source, diagnostics, next } = edit(program, { kind: "delete", targetId: "a" });
    expect(source).toBe(["// escena", "b = crear_circulo(radio=5, x=50, y=10); // se queda", 'crear_texto(contenido="fin", x=0, y=0);', ""].join("\n"));
    expect(diagnostics).toEqual([]);
    expect(next.shapes.map((s) => s.id)).toEqual(["b", "__shape_1"]);
    expect(next.connections).toEqual([]);
  });

  it("keeps a trailing comment when the line has other content", () => {
    const { source } = edit("a = crear_circulo(radio=5, x=1, y=1); // x\nb = crear_circulo(radio=5, x=2, y=2);", { kind: "delete", targetId: "a" });
    expect(source).toBe(" // x\nb = crear_circulo(radio=5, x=2, y=2);");
  });

  it("deletes a whole group with what is inside, and connections to its shapes", () => {
    const grouped = "a = crear_circulo(radio=5, x=1, y=1);\ngrupo(x=5) {\n  b = crear_circulo(radio=5, x=0, y=0);\n  conectar(a, b);\n}\ncrear_texto(contenido=\"ok\", x=0, y=0);\n";
    const scene = compile(grouped);
    const { source, diagnostics } = edit(grouped, { kind: "delete", targetId: scene.groups![0]!.id });
    expect(source).toBe('a = crear_circulo(radio=5, x=1, y=1);\ncrear_texto(contenido="ok", x=0, y=0);\n');
    expect(diagnostics).toEqual([]);
  });

  it("deletes a connection that lives outside the group when its shape goes away", () => {
    const grouped = "a = crear_circulo(radio=5, x=1, y=1);\ngrupo() { b = crear_circulo(radio=5, x=0, y=0); }\n";
    const scene = compile(grouped);
    expect(planEdit(grouped, scene, { kind: "delete", targetId: "b" }).ok).toBe(true);
  });

  it("refuses to delete a loop-generated shape without confirmation", () => {
    const loop = "para (let i = 0; i < 2; i = i + 1) { crear_circulo(radio=5, x=i, y=0); }";
    const scene = compile(loop);
    expect(planEdit(loop, scene, { kind: "delete", targetId: scene.shapes[0]!.id })).toMatchObject({ ok: false, reason: "shared" });
  });
});

describe("shapes inside transformed groups", () => {
  const program = "grupo(x=100, y=50, escala=2, rotacion=90) {\n  c = crear_circulo(radio=5, x=10, y=0);\n}";

  it("converts a canvas drag into the group's local space", () => {
    const scene = compile(program);
    const groups = new Map(scene.groups!.map((g) => [g.id, g]));
    const shape = scene.shapes[0]!;
    // Dragging 20px right on the canvas = 10 local units along the group's -y axis (rotated 90°, scaled ×2).
    const local = vectorToLocal({ x: 20, y: 0 }, shape.groupId, groups);
    expect(local.x).toBeCloseTo(0, 6);
    expect(local.y).toBeCloseTo(-10, 6);

    const before = toCanvasSpace({ x: 10, y: 0 }, shape.groupId, groups);
    const params = moveParams(shape, local.x, local.y);
    const after = toCanvasSpace({ x: Number(params.x), y: Number(params.y) }, shape.groupId, groups);
    expect(after.x - before.x).toBeCloseTo(20, 6);
    expect(after.y - before.y).toBeCloseTo(0, 6);
  });
});

describe("geometry helpers", () => {
  const scene = compile(
    [
      "r = crear_rectangulo(ancho=40, alto=20, x=10, y=10);",
      "c = crear_circulo(radio=10, x=50, y=50);",
      "l = crear_linea(x1=0, y1=0, x2=10, y2=10);",
      "t = crear_texto(contenido=\"hi\", x=5, y=5);",
      "rr = crear_rectangulo(ancho=40, alto=20, x=10, y=10, rotacion=30);",
    ].join("\n"),
  );
  const by = (id: string) => scene.shapes.find((s) => s.id === id)!;

  it("moves every coordinate a shape has", () => {
    expect(moveParams(by("r"), 5, -5)).toEqual({ x: 15, y: 5 });
    expect(moveParams(by("l"), 1, 2)).toEqual({ x1: 1, y1: 2, x2: 11, y2: 12 });
  });

  it("offers handles per shape kind (none for text or rotated rectangles)", () => {
    expect(handlesFor(by("r"))).toHaveLength(8);
    expect(handlesFor(by("c"))).toHaveLength(4);
    expect(handlesFor(by("l")).map((h) => h.id)).toEqual(["p1", "p2"]);
    expect(handlesFor(by("t"))).toEqual([]);
    expect(handlesFor(by("rr"))).toEqual([]);
  });

  it("resizes a rectangle from a corner and flips instead of going negative", () => {
    expect(resizeParams(by("r"), "se", { x: 70, y: 40 })).toEqual({ x: 10, y: 10, ancho: 60, alto: 30 });
    expect(resizeParams(by("r"), "nw", { x: 0, y: 0 })).toEqual({ x: 0, y: 0, ancho: 50, alto: 30 });
    expect(resizeParams(by("r"), "e", { x: -20, y: 0 })).toMatchObject({ x: -20, ancho: 30 });
  });

  it("resizes a circle by its distance to the center and moves a line endpoint", () => {
    expect(resizeParams(by("c"), "e", { x: 80, y: 50 })).toEqual({ radio: 30 });
    expect(resizeParams(by("c"), "e", { x: 50, y: 50 })).toEqual({ radio: 1 });
    expect(resizeParams(by("l"), "p2", { x: 20, y: 30 })).toEqual({ x2: 20, y2: 30 });
  });
});

describe("source mapping", () => {
  it("every statically written shape maps back to its exact statement", () => {
    const program = "// c\nc1 = crear_circulo(radio=5, x=1, y=2);\n  crear_texto(contenido=\"t\", x=0, y=0);\n";
    const scene = compile(program);
    const [c1, text] = scene.shapes;
    expect(program.slice(c1!.origin!.statementSpan.start, c1!.origin!.statementSpan.end)).toBe("c1 = crear_circulo(radio=5, x=1, y=2)");
    expect(program.slice(c1!.origin!.callSpan.start, c1!.origin!.callSpan.end)).toBe("crear_circulo(radio=5, x=1, y=2)");
    expect(program.slice(text!.origin!.statementSpan.start, text!.origin!.statementSpan.end)).toBe('crear_texto(contenido="t", x=0, y=0)');
    expect(c1!.origin!.params.x).toMatchObject({ editability: "literal" });
    expect(program.slice(c1!.origin!.params.x!.span!.start, c1!.origin!.params.x!.span!.end)).toBe("1");
    expect(c1!.origin!.params.color).toEqual({ editability: "default" });
  });

  it("gives every instance of a loop the same site, distinct ids, and counts them", () => {
    const scene = compile("para (let i = 0; i < 4; i = i + 1) { crear_circulo(radio=5, x=i, y=0); }");
    expect(new Set(scene.shapes.map((s) => s.origin!.site)).size).toBe(1);
    expect(new Set(scene.shapes.map((s) => s.id)).size).toBe(4);
    expect(scene.shapes[0]!.origin).toMatchObject({ dynamic: true, instances: 4 });
    expect(scene.shapes.map((s) => s.instance)).toEqual([0, 1, 2, 3]);
  });

  it("keeps ids stable when values are edited, and when an unrelated statement is added above", () => {
    const base = "a = crear_circulo(radio=5, x=1, y=1);\nfor_loop_marker = 1;\n";
    void base;
    const loop = "para (let i = 0; i < 3; i = i + 1) { crear_circulo(radio=5, x=i, y=0); }";
    const ids = compile(loop).shapes.map((s) => s.id);
    expect(compile(loop.replace("radio=5", "radio=9")).shapes.map((s) => s.id)).toEqual(ids);
  });

  it("marks parameters computed by an expression, with what they depend on", () => {
    const scene = compile("const k = 3;\ncrear_circulo(radio=k * 2, x=1, y=sin(k));");
    const origin = scene.shapes[0]!.origin!;
    expect(origin.params.radio).toMatchObject({ editability: "expression", dependsOn: ["k"] });
    expect(origin.params.y).toMatchObject({ editability: "expression", dependsOn: ["k"] });
    expect(origin.params.x).toMatchObject({ editability: "literal" });
  });
});
