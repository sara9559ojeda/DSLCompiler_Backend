import type { IExporter } from "./IExporter.js";

export class SvgExporter implements IExporter {
  readonly format = "svg" as const;

  async export(svg: string): Promise<Buffer> {
    return Buffer.from(svg, "utf-8");
  }
}
