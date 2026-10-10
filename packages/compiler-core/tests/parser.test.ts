import { describe, expect, it } from "vitest";
import { Lexer } from "../src/lexer/Lexer.js";
import { Parser } from "../src/parser/Parser.js";
import { AssignmentNode } from "../src/ast/nodes/AssignmentNode.js";
import { CommandCallNode } from "../src/ast/nodes/CommandCallNode.js";
import { IdentifierValueNode, NumberLiteralNode } from "../src/ast/nodes/ValueNode.js";

function parse(source: string) {
  const { tokens } = new Lexer(source).tokenize();
  return new Parser(tokens).parse();
}

describe("Parser", () => {
  it("parses an assignment with named arguments", () => {
    const { program, diagnostics } = parse("c1 = crear_circulo(radio=50, x=1, y=2);");

    expect(diagnostics).toHaveLength(0);
    expect(program.statements).toHaveLength(1);

    const statement = program.statements[0];
    expect(statement).toBeInstanceOf(AssignmentNode);
    const assignment = statement as AssignmentNode;
    expect(assignment.identifier).toBe("c1");
    expect(assignment.call.name).toBe("crear_circulo");
    expect(assignment.call.args).toHaveLength(3);
    expect(assignment.call.args[0]?.name).toBe("radio");
    expect(assignment.call.args[0]?.value).toBeInstanceOf(NumberLiteralNode);
  });

  it("parses a bare command call with positional and named arguments", () => {
    const { program, diagnostics } = parse("conectar(c1, r1, tipo=linea);");

    expect(diagnostics).toHaveLength(0);
    const statement = program.statements[0];
    expect(statement).toBeInstanceOf(CommandCallNode);
    const call = statement as CommandCallNode;

    expect(call.args[0]?.name).toBeNull();
    expect(call.args[0]?.value).toBeInstanceOf(IdentifierValueNode);
    expect((call.args[0]?.value as IdentifierValueNode).name).toBe("c1");
    expect(call.args[2]?.name).toBe("tipo");
  });

  it("parses multiple statements in sequence", () => {
    const { program, diagnostics } = parse(
      "c1 = crear_circulo(radio=1, x=0, y=0);\nr1 = crear_rectangulo(ancho=1, alto=1, x=0, y=0);",
    );
    expect(diagnostics).toHaveLength(0);
    expect(program.statements).toHaveLength(2);
  });

  it("recovers from a syntax error and keeps parsing subsequent statements", () => {
    const { program, diagnostics } = parse(
      "crear_circulo(x=1 y=2);\nr1 = crear_rectangulo(ancho=1, alto=1, x=0, y=0);",
    );

    expect(diagnostics).toHaveLength(1);
    expect(program.statements).toHaveLength(1);
    expect((program.statements[0] as AssignmentNode).identifier).toBe("r1");
  });

  it("reports a missing semicolon", () => {
    const { diagnostics } = parse("crear_circulo(x=1, y=2, radio=1)");
    expect(diagnostics.length).toBeGreaterThan(0);
  });
});
