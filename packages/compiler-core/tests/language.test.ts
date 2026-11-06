import { describe, expect, it } from "vitest";
import { createDefaultPipeline } from "../src/index.js";

const pipeline = createDefaultPipeline();
const stages = (source: string) => pipeline.compileWithStages(source);
const errors = (source: string) => stages(source).result.diagnostics;
const codes = (source: string) => errors(source).map((d) => d.code);
const shapes = (source: string) => stages(source).scene.shapes;

/** Runs a one-expression program and returns the `x` of the single circle it draws. */
function evalNumber(expression: string, prelude = ""): number {
  const result = stages(`${prelude}crear_circulo(radio=1, x=${expression}, y=0);`);
  expect(result.result.diagnostics).toEqual([]);
  return Number(result.scene.shapes[0]!.params.x);
}

describe("expressions", () => {
  it("respects operator precedence and parentheses", () => {
    expect(evalNumber("2 + 3 * 4")).toBe(14);
    expect(evalNumber("(2 + 3) * 4")).toBe(20);
    expect(evalNumber("10 - 4 - 3")).toBe(3); // left associative
    expect(evalNumber("100 / 10 / 5")).toBe(2);
    expect(evalNumber("7 % 4 + 1")).toBe(4);
  });

  it("handles negation without breaking subtraction", () => {
    expect(evalNumber("-5")).toBe(-5);
    expect(evalNumber("3 - -2")).toBe(5);
    expect(evalNumber("-(2 + 3)")).toBe(-5);
    expect(evalNumber("10 -5")).toBe(5);
  });

  it("evaluates comparisons and logic as 1 / 0", () => {
    expect(evalNumber("(3 < 5) + (5 <= 5) + (6 > 7) + (2 != 2) + (4 == 4)")).toBe(3);
    expect(evalNumber("(1 && 0) + (1 || 0) + !0")).toBe(2);
  });

  it("short-circuits && and ||, so the right side can be a guard", () => {
    expect(codes("const d = 0;\ncrear_circulo(radio=1, x=(d != 0 && 10 / d > 1), y=0);")).toEqual([]);
  });

  it("has math builtins that work in degrees", () => {
    expect(evalNumber("sin(30)")).toBe(0.5);
    expect(evalNumber("cos(90)")).toBe(0); // no 6e-17 noise
    expect(evalNumber("sqrt(16) + abs(-3)")).toBe(7);
    expect(evalNumber("min(4, 2, 8) + max(1, 9)")).toBe(11);
    expect(evalNumber("floor(2.9) + ceil(2.1) + round(2.5)")).toBe(8);
  });

  it("joins text with +", () => {
    const [shape] = shapes('crear_texto(contenido="n=" + 3, x=0, y=0);');
    expect(shape!.params.contenido).toBe("n=3");
  });

  it("reports division by zero and non-real results", () => {
    expect(codes("crear_circulo(radio=1, x=1/0, y=0);")).toContain("SEM-020");
    expect(codes("crear_circulo(radio=1, x=sqrt(-1), y=0);")).toContain("SEM-030");
  });

  it("reports incompatible operands with a clear message", () => {
    const [diagnostic] = errors('crear_circulo(radio=1, x=rojo * 2, y=0);');
    expect(diagnostic).toMatchObject({ code: "SEM-021" });
    expect(diagnostic!.message).toContain("color");
  });

  it("checks builtin arity", () => {
    expect(codes("crear_circulo(radio=1, x=sin(), y=0);")).toContain("SEM-019");
    expect(codes("crear_circulo(radio=1, x=min(1), y=0);")).toContain("SEM-019");
  });
});

describe("variables and scopes", () => {
  it("declares const and let, and uses them as arguments", () => {
    const [shape] = shapes("const cx = 250;\nlet r = 50;\nr = r + 10;\ncrear_circulo(radio=r, x=cx, y=cx / 2, color=azul);");
    expect(shape!.params).toMatchObject({ radio: 60, x: 250, y: 125, color: "#1e88e5" });
  });

  it("rejects reassigning a const and undeclared variables", () => {
    expect(codes("const a = 1;\na = 2;")).toEqual(["SEM-016"]);
    expect(codes("b = 2;")).toEqual(["SEM-015"]);
    expect(codes("crear_circulo(radio=zz, x=0, y=0);")).toEqual(["SEM-015"]);
  });

  it("rejects redeclaring in the same scope but allows shadowing in an inner one", () => {
    expect(codes("const a = 1;\nconst a = 2;")).toEqual(["SEM-017"]);
    expect(codes("const a = 1;\nsi (1) {\n  const a = 2;\n}")).toEqual([]);
  });

  it("scopes block variables lexically", () => {
    expect(codes("si (1) { let t = 5; }\ncrear_circulo(radio=t, x=0, y=0);")).toEqual(["SEM-015"]);
  });

  it("does not allow naming a variable like a command or builtin", () => {
    expect(codes("const sin = 3;")).toEqual(["SEM-018"]);
    expect(codes("const crear_circulo = 3;")).toEqual(["SEM-018"]);
  });

  it("suggests the closest variable for a typo", () => {
    const [diagnostic] = errors("const centro = 5;\ncrear_circulo(radio=1, x=centr, y=0);");
    expect(diagnostic!.suggestion).toContain("centro");
  });
});

describe("control flow", () => {
  it("runs a for loop with the header from the spec (20 circles around a point)", () => {
    const source = [
      "const cantidad = 20;",
      "para (let i = 0; i < cantidad; i = i + 1) {",
      "  crear_circulo(x=250 + cos(i * 360 / cantidad) * 120, y=200 + sin(i * 360 / cantidad) * 120, radio=8, color=azul);",
      "}",
    ].join("\n");
    const result = stages(source);
    expect(result.result.diagnostics).toEqual([]);
    expect(result.scene.shapes).toHaveLength(20);
    expect(result.scene.shapes[0]!.params).toMatchObject({ x: 370, y: 200 });
    expect(result.result.svg!.match(/<circle/g)).toHaveLength(20);
  });

  it("changing the count changes the result", () => {
    const make = (n: number) => shapes(`para (let i = 0; i < ${n}; i = i + 1) { crear_circulo(radio=1, x=i, y=0); }`).length;
    expect([make(0), make(3), make(12)]).toEqual([0, 3, 12]);
  });

  it("supports si / sino / sino si", () => {
    const pick = (n: number) =>
      shapes(`si (${n} < 0) { crear_circulo(radio=1, x=1, y=0); } sino si (${n} == 0) { crear_circulo(radio=1, x=2, y=0); } sino { crear_circulo(radio=1, x=3, y=0); }`)[0]!.params.x;
    expect([pick(-1), pick(0), pick(5)]).toEqual([1, 2, 3]);
  });

  it("stops a runaway loop with SEM-022 instead of hanging", () => {
    const result = stages("para (let i = 0; i >= 0; i = i + 1) { let a = 1; }");
    expect(result.result.diagnostics.map((d) => d.code)).toEqual(["SEM-022"]);
    expect(result.result.success).toBe(false);
  });

  it("stops a loop with no condition", () => {
    expect(codes("para (let i = 0; ; i = i + 1) { let a = 1; }")).toEqual(["SEM-022"]);
  });

  it("limits the number of emitted elements (SEM-024)", () => {
    expect(codes("para (let i = 0; i < 9000; i = i + 1) { crear_circulo(radio=1, x=0, y=0); }")).toContain("SEM-024");
  });

  it("limits total work with a step budget (SEM-025)", () => {
    const nested = "para (let i = 0; i < 9000; i = i + 1) { para (let j = 0; j < 9000; j = j + 1) { let a = i * j; } }";
    expect(codes(nested)).toEqual(["SEM-025"]);
  });

  it("reports an error inside a loop once, not once per iteration", () => {
    expect(codes("para (let i = 0; i < 1000; i = i + 1) { crear_circulo(radio=nope, x=0, y=0); }")).toEqual(["SEM-015"]);
  });

  it("can be cancelled mid-run (SEM-026)", () => {
    let calls = 0;
    const result = pipeline.compile("para (let i = 0; i < 9000; i = i + 1) { let a = i; }", {
      isCancelled: () => (calls += 1) > 1,
    });
    expect(result.diagnostics.map((d) => d.code)).toEqual(["SEM-026"]);
  });
});

describe("functions", () => {
  const flower = [
    "funcion petalos(x, y, cantidad) {",
    "  para (let i = 0; i < cantidad; i = i + 1) {",
    "    crear_circulo(x=x + cos(i * 360 / cantidad) * 40, y=y + sin(i * 360 / cantidad) * 40, radio=15, color=rosa);",
    "  }",
    "}",
  ].join("\n");

  it("defines and calls a function, positionally or by name", () => {
    expect(shapes(`${flower}\npetalos(200, 200, 8);`)).toHaveLength(8);
    expect(shapes(`${flower}\npetalos(cantidad=5, x=0, y=0);`)).toHaveLength(5);
  });

  it("can be called before its declaration (functions are hoisted)", () => {
    expect(shapes(`petalos(1, 1, 3);\n${flower}`)).toHaveLength(3);
  });

  it("returns values and can be used inside expressions", () => {
    const source = "funcion doble(n) { retornar n * 2; }\ncrear_circulo(radio=1, x=doble(doble(5)), y=0);";
    expect(shapes(source)[0]!.params.x).toBe(20);
  });

  it("supports bounded recursion (a fractal)", () => {
    const source = [
      "funcion arbol(x, y, tam, nivel) {",
      "  crear_circulo(radio=tam, x=x, y=y);",
      "  si (nivel > 0) {",
      "    arbol(x - tam, y + tam, tam / 2, nivel - 1);",
      "    arbol(x + tam, y + tam, tam / 2, nivel - 1);",
      "  }",
      "}",
      "arbol(400, 50, 40, 4);",
    ].join("\n");
    expect(shapes(source)).toHaveLength(31); // 1 + 2 + 4 + 8 + 16
  });

  it("stops unbounded recursion with SEM-023", () => {
    expect(codes("funcion f(n) { f(n + 1); }\nf(0);")).toEqual(["SEM-023"]);
  });

  it("validates calls: arity, names, missing values", () => {
    const f = "funcion f(a, b) { retornar a + b; }\n";
    expect(codes(`${f}crear_circulo(radio=f(1), x=0, y=0);`)).toContain("SEM-009");
    expect(codes(`${f}f(1, 2, 3);`)).toContain("SEM-006");
    expect(codes(`${f}f(1, c=2);`)).toContain("SEM-008");
    expect(codes("funcion g() { }\ncrear_circulo(radio=g(), x=0, y=0);")).toContain("SEM-029");
  });

  it("only allows declaring functions at the top level, and 'retornar' inside them", () => {
    expect(codes("si (1) { funcion f() { } }")).toContain("SEM-028");
    expect(codes("retornar 3;")).toEqual(["SEM-027"]);
  });

  it("refuses names that clash with commands or builtins", () => {
    expect(codes("funcion sin(a) { retornar a; }")).toEqual(["SEM-018"]);
    expect(codes("funcion f() { }\nfuncion f() { }")).toEqual(["SEM-018"]);
  });

  it("suggests the closest function for a typo", () => {
    const [diagnostic] = errors(`${flower}\npetaloz(1, 1, 3);`);
    expect(diagnostic).toMatchObject({ code: "SEM-004" });
    expect(diagnostic!.suggestion).toContain("petalos");
  });
});

describe("groups and transforms", () => {
  it("wraps members in a <g> with the transform", () => {
    const { result, scene } = stages("grupo(x=100, y=50, escala=2, rotacion=90, opacidad=0.5) { crear_circulo(radio=5, x=0, y=0); }");
    expect(result.diagnostics).toEqual([]);
    expect(scene.groups).toHaveLength(1);
    expect(result.svg).toContain('<g transform="translate(100 50) rotate(90) scale(2)" opacity="0.5"><circle');
    expect(result.svg).toContain("</g></svg>");
  });

  it("nests groups, in order", () => {
    const { result, scene } = stages(
      "grupo(x=10) { crear_circulo(radio=1, x=0, y=0); grupo(y=20) { crear_circulo(radio=2, x=0, y=0); } crear_circulo(radio=3, x=0, y=0); }",
    );
    expect(result.diagnostics).toEqual([]);
    expect(scene.groups!.map((g) => g.parentId ?? null)).toEqual([null, scene.groups![0]!.id]);
    expect(result.svg!.replace(/ fill="[^"]*"/g, "")).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">' +
        '<g transform="translate(10 0)"><circle cx="0" cy="0" r="1" /><g transform="translate(0 20)"><circle cx="0" cy="0" r="2" /></g><circle cx="0" cy="0" r="3" /></g></svg>',
    );
  });

  it("repeats a group in a loop", () => {
    const { scene } = stages("para (let i = 0; i < 3; i = i + 1) { grupo(x=i * 100, rotacion=i * 10) { crear_rectangulo(ancho=10, alto=10, x=0, y=0); } }");
    expect(scene.groups).toHaveLength(3);
    expect(new Set(scene.groups!.map((g) => g.id)).size).toBe(3);
  });

  it("validates group arguments like any command", () => {
    expect(codes("grupo(zoom=2) { }")).toContain("SEM-008");
    expect(codes("grupo(x=rojo) { }")).toContain("SEM-010");
  });

  it("anchors connections in canvas space through group transforms", () => {
    const { result } = stages(
      "a = crear_circulo(radio=5, x=10, y=0);\ngrupo(x=100, y=100) { b = crear_circulo(radio=5, x=10, y=0); conectar(a, b); }",
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.svg).toContain('<line x1="10" y1="0" x2="110" y2="100"');
  });

  it("rotates a shape and sets opacity only when asked", () => {
    const withRotation = stages("crear_rectangulo(ancho=20, alto=10, x=0, y=0, rotacion=45, opacidad=0.5);").result.svg!;
    expect(withRotation).toContain('transform="rotate(45 10 5)"');
    expect(withRotation).toContain('opacity="0.5"');
    const plain = stages("crear_rectangulo(ancho=20, alto=10, x=0, y=0);").result.svg!;
    expect(plain).not.toContain("transform");
    expect(plain).not.toContain("opacity");
  });
});

describe("compatibility with the original language", () => {
  const original = [
    "c1 = crear_circulo(radio=50, color=rojo, x=100, y=100);",
    "r1 = crear_rectangulo(ancho=80, alto=40, color=azul, x=200, y=150);",
    't1 = crear_texto(contenido="Hola", x=50, y=50, color=negro);',
    "conectar(c1, r1, tipo=flecha);",
  ].join("\n");

  it("renders an original program exactly as before (no transform/opacity noise)", () => {
    const { result } = stages(original);
    expect(result.diagnostics).toEqual([]);
    const svg = result.svg!;
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">')).toBe(true);
    expect(svg).toContain('<circle cx="100" cy="100" r="50" fill="#e53935" />');
    expect(svg).toContain('<rect x="200" y="150" width="80" height="40" fill="#1e88e5" />');
    expect(svg).toContain('<text x="50" y="50" fill="#000000" font-size="16" font-family="sans-serif">Hola</text>');
    expect(svg).toContain('<line x1="100" y1="100" x2="240" y2="170" stroke="#000000" stroke-width="2" />');
    expect(svg).toContain("<polygon points=");
    expect(svg).not.toContain("transform");
    expect(svg).not.toContain("opacity");
    expect(svg).not.toContain("data-");
  });

  it("keeps the original ids: binding names and __shape_N", () => {
    const { scene } = stages('c1 = crear_circulo(radio=1, x=0, y=0);\ncrear_texto(contenido="a", x=0, y=0);');
    expect(scene.shapes.map((s) => s.id)).toEqual(["c1", "__shape_1"]);
  });

  it("still accepts a color name that is also a shape name, and bare enum words", () => {
    expect(codes("azul = crear_circulo(radio=1, x=0, y=0);\nc = crear_circulo(radio=1, x=0, y=0, color=azul);\nconectar(azul, c, tipo=flecha);")).toEqual([]);
  });
});
