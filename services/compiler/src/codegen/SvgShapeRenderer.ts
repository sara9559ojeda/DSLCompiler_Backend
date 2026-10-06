import { DEFAULT_STROKE_WIDTH } from "@compiler-img/shared";
import { SVG_FONT_FAMILY, ARROW_LENGTH, ARROW_ANGLE_RADIANS } from "../config/compiler.config.js";
import type { CanvasConfig, ResolvedConnection, ResolvedShape } from "../semantic/Scene.js";
import type { IShapeRenderer } from "./IShapeRenderer.js";

interface Point {
  readonly x: number;
  readonly y: number;
}

const escapeXml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

type ShapeDrawer = (params: Readonly<Record<string, number | string>>) => string;

/** Only concrete IShapeRenderer today; produces the SVG markup for each shape kind. */
export class SvgShapeRenderer implements IShapeRenderer {
  private readonly drawers = new Map<string, ShapeDrawer>([
    ["crear_circulo", (p) => `<circle cx="${p.x}" cy="${p.y}" r="${p.radio}" fill="${p.color}" />`],
    [
      "crear_rectangulo",
      (p) => `<rect x="${p.x}" y="${p.y}" width="${p.ancho}" height="${p.alto}" fill="${p.color}" />`,
    ],
    [
      "crear_linea",
      (p) =>
        `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${p.color}" stroke-width="${DEFAULT_STROKE_WIDTH}" />`,
    ],
    [
      "crear_texto",
      (p) =>
        `<text x="${p.x}" y="${p.y}" fill="${p.color}" font-size="${p.tamano}" font-family="${SVG_FONT_FAMILY}">${escapeXml(String(p.contenido))}</text>`,
    ],
  ]);

  renderShape(shape: ResolvedShape): string {
    const draw = this.drawers.get(shape.kind);
    if (!draw) {
      throw new Error(`No hay un renderer registrado para la figura '${shape.kind}'.`);
    }
    return draw(shape.params);
  }

  renderConnection(connection: ResolvedConnection, from: ResolvedShape, to: ResolvedShape): string {
    const start = this.getAnchor(from);
    const end = this.getAnchor(to);
    const color = String(connection.params.color);

    let markup = `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="${DEFAULT_STROKE_WIDTH}" />`;
    if (connection.params.tipo === "flecha") {
      markup += this.renderArrowhead(start, end, color);
    }
    return markup;
  }

  wrapDocument(body: string, canvas: CanvasConfig): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="${canvas.width}" height="${canvas.height}">${body}</svg>`;
  }

  private getAnchor(shape: ResolvedShape): Point {
    const p = shape.params;
    switch (shape.kind) {
      case "crear_rectangulo":
        return { x: Number(p.x) + Number(p.ancho) / 2, y: Number(p.y) + Number(p.alto) / 2 };
      case "crear_linea":
        return { x: (Number(p.x1) + Number(p.x2)) / 2, y: (Number(p.y1) + Number(p.y2)) / 2 };
      case "crear_circulo":
      case "crear_texto":
      default:
        return { x: Number(p.x), y: Number(p.y) };
    }
  }

  private renderArrowhead(start: Point, end: Point, color: string): string {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const leftX = end.x - ARROW_LENGTH * Math.cos(angle - ARROW_ANGLE_RADIANS);
    const leftY = end.y - ARROW_LENGTH * Math.sin(angle - ARROW_ANGLE_RADIANS);
    const rightX = end.x - ARROW_LENGTH * Math.cos(angle + ARROW_ANGLE_RADIANS);
    const rightY = end.y - ARROW_LENGTH * Math.sin(angle + ARROW_ANGLE_RADIANS);
    return `<polygon points="${end.x},${end.y} ${leftX},${leftY} ${rightX},${rightY}" fill="${color}" />`;
  }
}
