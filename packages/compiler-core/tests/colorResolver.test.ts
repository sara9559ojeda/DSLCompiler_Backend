import { describe, expect, it } from "vitest";
import { ColorResolver } from "../src/semantic/ColorResolver.js";

describe("ColorResolver", () => {
  const resolver = new ColorResolver({ rojo: "#e53935", azul: "#1e88e5" });

  it("resolves a known color name to its hex value", () => {
    expect(resolver.resolve("rojo")).toBe("#e53935");
  });

  it("returns undefined for an unknown name", () => {
    expect(resolver.resolve("magenta")).toBeUndefined();
  });

  it("is case-sensitive, like the language's identifiers", () => {
    expect(resolver.resolve("Rojo")).toBeUndefined();
  });

  it("does not resolve inherited object properties", () => {
    expect(resolver.resolve("toString")).toBeUndefined();
  });

  it("lists every name it knows", () => {
    expect(resolver.names()).toEqual(["rojo", "azul"]);
  });
});
