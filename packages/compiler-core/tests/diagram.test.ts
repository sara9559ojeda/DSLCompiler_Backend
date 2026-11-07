import { describe, expect, it } from "vitest";
import { applyChanges, createDefaultPipeline, planEdit, type Scene } from "../src/index.js";

const pipeline = createDefaultPipeline({ embedIds: true });
const compile = (source: string) => pipeline.compileWithStages(source);
const sceneOf = (source: string): Scene => compile(source).scene;
const codes = (source: string): string[] => compile(source).result.diagnostics.map((d) => d.code);

const FLOW = `diagrama flujo {
  a = nodo("Inicio", tipo=inicio);
  b = nodo("Validar", tipo=decision);
  c = nodo("Fin");
  conectar(a, b);
  conectar(b, c, etiqueta="ok");
}`;

describe("diagrama: language", () => {
  it("compiles a flow into nodes, arrows and a group", () => {
    const stages = compile(FLOW);
    expect(stages.result.success).toBe(true);
    expect(stages.scene.shapes.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(stages.scene.shapes.every((s) => s.kind === "nodo")).toBe(true);
    expect(stages.scene.connections).toHaveLength(2);
    expect(stages.scene.connections[0]!.params.tipo).toBe("flecha");
    expect(stages.scene.groups?.[0]?.diagram?.type).toBe("flujo");
    expect(stages.result.success && stages.result.svg).toContain("Validar");
  });

  it("lays a vertical flow top to bottom and a horizontal one left to right", () => {
    const vertical = sceneOf(FLOW).shapes.map((s) => s.params);
    expect(Number(vertical[1]!.y)).toBeGreaterThan(Number(vertical[0]!.y));
    expect(Number(vertical[2]!.y)).toBeGreaterThan(Number(vertical[1]!.y));

    const horizontal = sceneOf(FLOW.replace("diagrama flujo {", 'diagrama flujo(direccion="horizontal") {')).shapes.map((s) => s.params);
    expect(Number(horizontal[1]!.x)).toBeGreaterThan(Number(horizontal[0]!.x));
  });

  it("is deterministic", () => {
    expect(JSON.stringify(sceneOf(FLOW))).toBe(JSON.stringify(sceneOf(FLOW)));
  });

  it("never overlaps nodes of the same rank", () => {
    const source = `diagrama arquitectura {
      r = nodo("Raíz");
      para (let i = 0; i < 6; i = i + 1) { h = nodo("Hijo " + i); conectar(r, h); }
    }`;
    const nodes = sceneOf(source).shapes;
    for (const [i, first] of nodes.entries()) {
      for (const second of nodes.slice(i + 1)) {
        const overlap =
          Number(first.params.x) < Number(second.params.x) + Number(second.params.ancho) &&
          Number(second.params.x) < Number(first.params.x) + Number(first.params.ancho) &&
          Number(first.params.y) < Number(second.params.y) + Number(second.params.alto) &&
          Number(second.params.y) < Number(first.params.y) + Number(first.params.alto);
        expect(overlap).toBe(false);
      }
    }
  });

  it("generates nodes from loops and functions", () => {
    const source = `funcion servicio(nombre) { nodo(nombre); }
    diagrama red { para (let i = 0; i < 3; i = i + 1) { servicio("S" + i); } }`;
    expect(sceneOf(source).shapes).toHaveLength(3);
  });

  it("a coordinate written in the source pins that node and the rest stay automatic", () => {
    const scene = sceneOf(`diagrama flujo { a = nodo("A"); b = nodo("B", x=300, y=10); conectar(a, b); }`);
    const group = scene.groups![0]!;
    expect(group.diagram?.pinnedNodes).toEqual(["b"]);
    expect(group.diagram?.autoNodes).toEqual(["a"]);
    expect(scene.shapes[1]!.params.x).toBe(300);
  });

  it("grows the canvas when the diagram does not fit", () => {
    const source = `diagrama flujo(direccion="horizontal") { a = nodo("A"); ${Array.from({ length: 8 }, (_, i) => `n${i} = nodo("Nodo largo ${i}"); conectar(${i === 0 ? "a" : `n${i - 1}`}, n${i});`).join(" ")} }`;
    expect(sceneOf(source).canvas.width).toBeGreaterThan(800);
  });

  it("reports nodo outside a diagram and unknown diagram types", () => {
    expect(codes('nodo("x");')).toContain("SEM-031");
    expect(codes('diagrama flujoo { nodo("x"); }')).toContain("SEM-032");
    expect(codes("diagrama { }")).toContain("SYN-013");
  });
});

describe("diagrama: visual edits", () => {
  const edit = (source: string, request: Parameters<typeof planEdit>[2]): string => {
    const plan = planEdit(source, sceneOf(source), request);
    if (!plan.ok) throw new Error(plan.message);
    return applyChanges(source, plan.changes);
  };

  it("moving an automatic node pins it by appending x and y", () => {
    const out = edit(FLOW, { kind: "setParams", targetId: "c", params: { x: 120, y: 340 } });
    expect(out).toContain('c = nodo("Fin", x=120, y=340);');
  });

  it("removeParams brings a node back to the automatic layout without touching the rest", () => {
    const source = 'diagrama flujo {\n  a = nodo("A", x=10, y=20, color=rojo);\n}';
    expect(edit(source, { kind: "removeParams", targetId: "a", params: ["x", "y"] })).toBe(
      'diagrama flujo {\n  a = nodo("A", color=rojo);\n}',
    );
    expect(edit('diagrama flujo {\n  a = nodo("A", color=rojo, x=1, y=2);\n}', { kind: "removeParams", targetId: "a", params: ["x", "y"] })).toBe(
      'diagrama flujo {\n  a = nodo("A", color=rojo);\n}',
    );
    expect(edit('diagrama flujo {\n  a = nodo("A", x=1, y=2);\n}', { kind: "removeParams", targetId: "a", params: ["x", "y"] })).toBe(
      'diagrama flujo {\n  a = nodo("A");\n}',
    );
  });

  it("resetLayout frees every pinned node of the diagram", () => {
    const source = 'diagrama flujo {\n  a = nodo("A", x=1, y=2);\n  b = nodo("B", y=9);\n}';
    const out = edit(source, { kind: "resetLayout", targetId: sceneOf(source).groups![0]!.id });
    expect(out).toBe('diagrama flujo {\n  a = nodo("A");\n  b = nodo("B");\n}');
  });

  it("changes direction on a diagram written without parentheses", () => {
    const id = sceneOf(FLOW).groups![0]!.id;
    expect(edit(FLOW, { kind: "setParams", targetId: id, params: { direccion: "horizontal" } })).toMatch(/^diagrama flujo\(direccion=horizontal\) \{/);
  });

  it("deleting a node deletes its connections", () => {
    const out = edit(FLOW, { kind: "delete", targetId: "b" });
    expect(out).not.toContain("conectar");
    expect(out).not.toContain("Validar");
  });
});

describe("diagrama: svg", () => {
  it("draws arrows that stop at the node outline and a caption", () => {
    const result = compile(FLOW).result;
    expect(result.success && result.svg).toMatch(/<text[^>]*>ok<\/text>/);
  });
});
