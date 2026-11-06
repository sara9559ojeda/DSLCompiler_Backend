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
    const start = toCanvasSpace(this.getAnchor(from), from.groupId, groups);
    const end = toCanvasSpace(this.getAnchor(to), to.groupId, groups);
    const color = String(connection.params.color);

    let markup = `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="${DEFAULT_STROKE_WIDTH}" />`;
    if (connection.params.tipo === "flecha") {
      markup += this.renderArrowhead(start, end, color);
    }
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
