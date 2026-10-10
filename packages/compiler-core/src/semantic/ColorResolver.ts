/** Resolves a bare color name (e.g. `rojo`) to its hex value, from an injected table. */
export class ColorResolver {
  constructor(private readonly namedColors: Readonly<Record<string, string>>) {}

  resolve(name: string): string | undefined {
    return this.namedColors[name];
  }
}
