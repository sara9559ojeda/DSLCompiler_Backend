import { DEFAULT_STROKE_WIDTH } from "../registry/dsl-defaults.config.js";
import { SVG_FONT_FAMILY, ARROW_LENGTH, ARROW_ANGLE_RADIANS } from "../config/compiler.config.js";
import type { CanvasConfig, ResolvedConnection, ResolvedGroup, ResolvedShape } from "../semantic/Scene.js";
import type { IShapeRenderer } from "./IShapeRenderer.js";
import { toCanvasSpace, type Point } from "../semantic/groupTransform.js";

const escapeXml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const NODE_STROKE = "#06232d";
const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Black or white text, whichever reads better on a `#rrggbb` fill. */
function readableOn(fill: string): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(fill);
  if (!match) return "#000000";
  const [r, g, b] = [match[1]!, match[2]!, match[3]!].map((hex) => parseInt(hex, 16));
  return (0.299 * r! + 0.587 * g! + 0.114 * b!) / 255 > 0.6 ? "#000000" : "#ffffff";
}

type Params = Readonly<Record<string, number | string>>;
type ShapeDrawer = (params: Params, extras: string) => string;

export interface SvgRenderOptions {
  /**
   * Tag every element with `data-shape-id` / `data-group-id` so an editor can
   * map a click on the canvas back to the scene (and from there to the source).
   * Off for exports: they stay free of editor metadata.
   */
  readonly embedIds?: boolean;
}

/** Only concrete IShapeRenderer today; produces the SVG markup for each shape kind. */
export class SvgShapeRenderer implements IShapeRenderer {
  constructor(private readonly options: SvgRenderOptions = {}) {}

  private readonly drawers = new Map<string, ShapeDrawer>([
    ["crear_circulo", (p, e) => `<circle cx="${p.x}" cy="${p.y}" r="${p.radio}" fill="${p.color}"${e} />`],
    [
      "crear_rectangulo",
      (p, e) => {
        const rotation = this.rotation(p, Number(p.x) + Number(p.ancho) / 2, Number(p.y) + Number(p.alto) / 2);
        return `<rect x="${p.x}" y="${p.y}" width="${p.ancho}" height="${p.alto}" fill="${p.color}"${rotation}${e} />`;
      },
    ],
    [
      "crear_linea",
      (p, e) =>
        `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${p.color}" stroke-width="${DEFAULT_STROKE_WIDTH}"${e} />`,
    ],
    ["nodo", (p, e) => this.drawNode(p, e)],
    [
      "crear_texto",
      (p, e) =>
        `<text x="${p.x}" y="${p.y}" fill="${p.color}" font-size="${p.tamano}" font-family="${SVG_FONT_FAMILY}"${this.rotation(p, Number(p.x), Number(p.y))}${e}>${escapeXml(String(p.contenido))}</text>`,
    ],
  ]);

  renderShape(shape: ResolvedShape): string {
    const draw = this.drawers.get(shape.kind);
    if (!draw) {
      throw new Error(`No hay un renderer registrado para la figura '${shape.kind}'.`);
    }
    const id = this.options.embedIds ? ` data-shape-id="${escapeXml(shape.id)}"` : "";
    return draw(shape.params, `${this.opacity(shape.params)}${id}`);
  }

  renderConnection(
    connection: ResolvedConnection,
    from: ResolvedShape,
    to: ResolvedShape,
    groups: ReadonlyMap<string, ResolvedGroup> = new Map(),
  ): string {
    const fromCenter = toCanvasSpace(this.getAnchor(from), from.groupId, groups);
    const toCenter = toCanvasSpace(this.getAnchor(to), to.groupId, groups);
    // A line between two diagram nodes starts and ends on their outlines, not under them.
    const start = this.clipToNode(from, fromCenter, toCenter);
    const end = this.clipToNode(to, toCenter, fromCenter);
    const color = String(connection.params.color);

    let markup = `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="${DEFAULT_STROKE_WIDTH}" />`;
    if (connection.params.tipo === "flecha") {
      markup += this.renderArrowhead(start, end, color);
    }
    const caption = connection.params.etiqueta;
    if (typeof caption === "string" && caption !== "") markup += this.renderCaption(caption, start, end, color);
    return markup;
  }

  openGroup(group: ResolvedGroup): string {
    const { x = 0, y = 0, escala = 1, rotacion = 0, opacidad = 1 } = group.params;
    const parts: string[] = [];
    if (x !== 0 || y !== 0) parts.push(`translate(${x} ${y})`);
    if (rotacion !== 0) parts.push(`rotate(${rotacion})`);
    if (escala !== 1) parts.push(`scale(${escala})`);
    const transform = parts.length > 0 ? ` transform="${parts.join(" ")}"` : "";
    const opacity = opacidad !== 1 ? ` opacity="${opacidad}"` : "";
    const id = this.options.embedIds ? ` data-group-id="${escapeXml(group.id)}"` : "";
    return `<g${transform}${opacity}${id}>`;
  }

  closeGroup(): string {
    return "</g>";
  }

  wrapDocument(body: string, canvas: CanvasConfig): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="${canvas.width}" height="${canvas.height}">${body}</svg>`;
  }

  /** Emitted only when it differs from the default, so programs that don't use it render byte-for-byte as before. */
  private opacity(p: Params): string {
    return p.opacidad !== undefined && Number(p.opacidad) !== 1 ? ` opacity="${p.opacidad}"` : "";
  }

  private rotation(p: Params, centerX: number, centerY: number): string {
    return p.rotacion !== undefined && Number(p.rotacion) !== 0
      ? ` transform="rotate(${p.rotacion} ${centerX} ${centerY})"`
      : "";
  }

  private getAnchor(shape: ResolvedShape): Point {
    const p = shape.params;
    switch (shape.kind) {
      case "crear_rectangulo":
      case "nodo":
        return { x: Number(p.x) + Number(p.ancho) / 2, y: Number(p.y) + Number(p.alto) / 2 };
      case "crear_linea":
        return { x: (Number(p.x1) + Number(p.x2)) / 2, y: (Number(p.y1) + Number(p.y2)) / 2 };
      case "crear_circulo":
      case "crear_texto":
      default:
        return { x: Number(p.x), y: Number(p.y) };
    }
  }

  private drawNode(p: Params, extras: string): string {
    const x = Number(p.x);
    const y = Number(p.y);
    const w = Number(p.ancho);
    const h = Number(p.alto);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const fill = String(p.color);
    const outline = `fill="${fill}" stroke="${NODE_STROKE}" stroke-width="1.5"`;
    let body: string;
    switch (p.tipo) {
      case "decision":
        body = `<polygon points="${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}" ${outline} />`;
        break;
      case "circulo":
        body = `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" ${outline} />`;
        break;
      case "inicio":
        body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" ${outline} />`;
        break;
      case "redondeado":
        body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" ${outline} />`;
        break;
      default:
        body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" ${outline} />`;
    }
    const label = `<text x="${cx}" y="${cy}" fill="${readableOn(fill)}" font-size="14" font-family="${SVG_FONT_FAMILY}" text-anchor="middle" dominant-baseline="central">${escapeXml(String(p.etiqueta))}</text>`;
    return `<g${extras}>${body}${label}</g>`;
  }

  /** Where the segment from `center` towards `other` leaves the outline of a diagram node (the center for anything else). */
  private clipToNode(shape: ResolvedShape, center: Point, other: Point): Point {
    if (shape.kind !== "nodo") return center;
    const dx = other.x - center.x;
    const dy = other.y - center.y;
    if (dx === 0 && dy === 0) return center;
    const halfW = Number(shape.params.ancho) / 2;
    const halfH = Number(shape.params.alto) / 2;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    let t: number;
    switch (shape.params.tipo) {
      case "decision":
        t = 1 / (ax / halfW + ay / halfH);
        break;
      case "circulo":
        t = 1 / Math.hypot(dx / halfW, dy / halfH);
        break;
      default:
        t = Math.min(ax === 0 ? Infinity : halfW / ax, ay === 0 ? Infinity : halfH / ay);
    }
    return { x: round2(center.x + dx * t), y: round2(center.y + dy * t) };
  }

  private renderCaption(text: string, start: Point, end: Point, color: string): string {
    const mx = round2((start.x + end.x) / 2);
    const my = round2((start.y + end.y) / 2);
    const width = Math.round(text.length * 6.6 + 10);
    return (
      `<rect x="${round2(mx - width / 2)}" y="${my - 9}" width="${width}" height="18" fill="#ffffff" opacity="0.88" />` +
      `<text x="${mx}" y="${my}" fill="${color}" font-size="12" font-family="${SVG_FONT_FAMILY}" text-anchor="middle" dominant-baseline="central">${escapeXml(text)}</text>`
    );
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
