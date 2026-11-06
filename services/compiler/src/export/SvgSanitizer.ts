/**
 * Allowlist sanitizer for the SVG the compiler hands to exporters. The
 * generator already escapes user text, so this is defense in depth: if a
 * future renderer (or a bug) ever let markup through, an exported file
 * still can't carry scripts, event handlers, external references or
 * foreign elements.
 *
 * It only needs to understand the flat SVG our own CodeGenerator emits:
 * elements, double-quoted attributes and text. Anything else (comments,
 * CDATA, processing instructions, DOCTYPE, unknown elements and their
 * contents, unknown attributes) is dropped rather than interpreted.
 */
const ALLOWED_ELEMENTS: Readonly<Record<string, ReadonlySet<string>>> = {
  svg: new Set(["xmlns", "viewBox", "width", "height"]),
  g: new Set(["transform", "opacity"]),
  circle: new Set(["cx", "cy", "r", "fill", "opacity"]),
  rect: new Set(["x", "y", "width", "height", "fill", "opacity", "transform"]),
  line: new Set(["x1", "y1", "x2", "y2", "stroke", "stroke-width", "opacity"]),
  polygon: new Set(["points", "fill"]),
  text: new Set(["x", "y", "fill", "font-size", "font-family", "opacity", "transform"]),
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const NUMBER = /^-?\d+(\.\d+)?(e-?\d+)?$/i;
const COLOR = /^(#[0-9a-f]{3,8}|[a-z]+)$/i;
const NUMBER_LIST = /^[-\d.,\se]+$/i;
const FONT_FAMILY = /^[\w\s,-]+$/;

/** `translate(x y) rotate(a [cx cy]) scale(s [sy])` and nothing else: no url(), no matrix(), no expressions. */
function isSafeTransform(value: string): boolean {
  const calls = value.trim().split(")");
  if (calls.pop()?.trim() !== "" || calls.length === 0) return false;
  return calls.every((call) => {
    const match = /^\s*(translate|rotate|scale)\(([-\d.,\se]+)$/i.exec(call);
    if (!match) return false;
    const numbers = match[2]!.trim().split(/[\s,]+/);
    return numbers.length >= 1 && numbers.length <= 3 && numbers.every((n) => NUMBER.test(n));
  });
}

function isSafeValue(name: string, value: string): boolean {
  switch (name) {
    case "transform":
      return isSafeTransform(value);
    case "opacity":
      return NUMBER.test(value) && Number(value) >= 0 && Number(value) <= 1;
    case "xmlns":
      return value === SVG_NAMESPACE;
    case "fill":
    case "stroke":
      return COLOR.test(value);
    case "viewBox":
    case "points":
      return NUMBER_LIST.test(value);
    case "font-family":
      return FONT_FAMILY.test(value);
    default:
      return NUMBER.test(value);
  }
}

const TOKEN = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>|([^<]+)|(<[^>]*>?)/g;
const ATTRIBUTE = /([\w:-]+)="([^"]*)"/g;

export class SvgSanitizer {
  sanitize(svg: string): string {
    let output = "";
    // Depth inside an element we're dropping — its whole subtree is skipped.
    let droppedDepth = 0;
    const open: string[] = [];

    for (const match of svg.matchAll(TOKEN)) {
      const [, closing, rawName, rawAttributes = "", selfClosing, text] = match;

      if (text !== undefined) {
        if (droppedDepth === 0 && open.at(-1) === "text") output += text;
        continue;
      }
      if (rawName === undefined) continue; // comment / CDATA / PI / malformed tag

      const name = rawName.toLowerCase() === "svg" ? "svg" : rawName;
      const allowedAttributes = ALLOWED_ELEMENTS[name];

      if (closing) {
        if (droppedDepth > 0) droppedDepth -= 1;
        else if (open.at(-1) === name) output += `</${open.pop()}>`;
        continue;
      }

      if (droppedDepth > 0 || !allowedAttributes) {
        if (!selfClosing) droppedDepth += 1;
        continue;
      }

      let attributes = "";
      for (const [, attributeName, value] of rawAttributes.matchAll(ATTRIBUTE)) {
        if (attributeName && value !== undefined && allowedAttributes.has(attributeName) && isSafeValue(attributeName, value)) {
          attributes += ` ${attributeName}="${value}"`;
        }
      }

      if (selfClosing) {
        output += `<${name}${attributes} />`;
      } else {
        output += `<${name}${attributes}>`;
        open.push(name);
      }
    }

    // Close anything left open so the output is always well-formed.
    while (open.length > 0) output += `</${open.pop()}>`;
    return output;
  }
}
