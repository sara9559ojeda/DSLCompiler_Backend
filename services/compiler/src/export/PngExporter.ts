import type { IExporter } from "./IExporter.js";

export class PngExporter implements IExporter {
  readonly format = "png" as const;

  async export(svg: string): Promise<Buffer> {
    const sharp = (await import("sharp")).default;
    return sharp(Buffer.from(svg, "utf-8")).png().toBuffer();
  }
}
