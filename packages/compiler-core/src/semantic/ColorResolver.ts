/** Resolves a bare color name (e.g. `rojo`) to its hex value, from an injected table. */
export class ColorResolver {
  constructor(private readonly namedColors: Readonly<Record<string, string>>) {}

  /** Own properties only: `toString` or `constructor` must not resolve through Object.prototype. */
  resolve(name: string): string | undefined {
    return Object.hasOwn(this.namedColors, name) ? this.namedColors[name] : undefined;
  }

  names(): readonly string[] {
    return Object.keys(this.namedColors);
  }
}
