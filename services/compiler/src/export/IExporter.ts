export type ExportFormat = "svg" | "png";

/** SvgExporter and PngExporter are interchangeable wherever IExporter is expected (LSP). */
export interface IExporter {
  readonly format: ExportFormat;
  export(svg: string): Promise<Buffer>;
}
