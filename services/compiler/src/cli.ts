#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { createDefaultPipeline } from "./index.js";
import { SvgExporter } from "./export/SvgExporter.js";
import { PngExporter } from "./export/PngExporter.js";
import type { IExporter } from "./export/IExporter.js";

function parseFlag(args: readonly string[], flag: string): string | undefined {
  return args.find((arg) => arg.startsWith(`${flag}=`))?.split("=")[1];
}

async function main(): Promise<void> {
  const [, , inputPath, ...rest] = process.argv;
  if (!inputPath) {
    console.error("Uso: compiler-img <archivo.dsl> [--format=svg|png] [--out=salida]");
    process.exitCode = 1;
    return;
  }

  const format = parseFlag(rest, "--format") ?? "svg";
  const outPath = parseFlag(rest, "--out") ?? `output.${format}`;

  const source = await readFile(inputPath, "utf-8");
  const result = createDefaultPipeline().compile(source);

  for (const diagnostic of result.diagnostics) {
    console.error(
      `[${diagnostic.severity}] ${inputPath}:${diagnostic.position.line}:${diagnostic.position.column} ${diagnostic.message}`,
    );
  }

  if (!result.success || result.svg === null) {
    process.exitCode = 1;
    return;
  }

  const exporter: IExporter = format === "png" ? new PngExporter() : new SvgExporter();
  const buffer = await exporter.export(result.svg);
  await writeFile(outPath, buffer);
  console.log(`Generado: ${outPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
