import { describe, expect, it } from "vitest";
import { createDefaultPipeline } from "@saramariaojeda9559/compiler-core";
import { SvgSanitizer } from "../src/export/SvgSanitizer.js";

const sanitize = (svg: string) => new SvgSanitizer().sanitize(svg);

describe("SvgSanitizer", () => {
  it("leaves the compiler's own output byte-for-byte intact", () => {
    const svg = createDefaultPipeline().compile(
      'a = crear_circulo(radio=5, x=5, y=5, color=#ff8800);\nb = crear_rectangulo(ancho=9, alto=9, x=50, y=0);\ncrear_linea(x1=0, y1=0, x2=9, y2=9);\ncrear_texto(contenido="Hola <b> & \'tú\'", x=5, y=50);\nconectar(a, b, tipo=flecha);',
    ).svg!;
    expect(sanitize(svg)).toBe(svg);
  });

  it("drops <script> elements and their contents", () => {
    expect(sanitize('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="1" cy="1" r="1" fill="red" /></svg>')).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="1" cy="1" r="1" fill="red" /></svg>',
    );
  });

  it("drops event handlers and external references", () => {
    expect(
      sanitize('<svg><rect x="0" y="0" width="5" height="5" fill="red" onload="alert(1)" href="javascript:alert(1)" /></svg>'),
    ).toBe('<svg><rect x="0" y="0" width="5" height="5" fill="red" /></svg>');
  });

  it("rejects attribute values that aren't plain numbers/colors", () => {
    expect(sanitize('<svg><circle cx="1" cy="1" r="1" fill="url(https://evil.example/x)" /></svg>')).toBe(
      '<svg><circle cx="1" cy="1" r="1" /></svg>',
    );
  });

  it("drops foreign elements (foreignObject, image, use) with their subtree", () => {
    expect(
      sanitize('<svg><foreignObject><div>x</div></foreignObject><image href="x.png" /><use href="#a" /></svg>'),
    ).toBe("<svg></svg>");
  });

  it("drops comments, CDATA and processing instructions", () => {
    expect(sanitize('<?xml-stylesheet href="x"?><svg><!-- hi --><![CDATA[<script>]]></svg>')).toBe("<svg></svg>");
  });

  it("keeps text content only inside <text>, still escaped", () => {
    expect(sanitize('<svg>stray<text x="1" y="1">a &lt; b</text></svg>')).toBe('<svg><text x="1" y="1">a &lt; b</text></svg>');
  });

  it("always returns well-formed output (closes dangling tags)", () => {
    expect(sanitize('<svg><text x="1" y="1">hola')).toBe('<svg><text x="1" y="1">hola</text></svg>');
  });
});
