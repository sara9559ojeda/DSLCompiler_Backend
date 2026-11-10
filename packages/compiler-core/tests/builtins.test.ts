import { describe, expect, it } from "vitest";
import { BUILTIN_FUNCTIONS, BUILTINS_BY_NAME, cleanNumber } from "../src/semantic/builtins.js";

const run = (name: string, ...args: number[]): number => BUILTINS_BY_NAME.get(name)!.run(args);

describe("math builtins", () => {
  it("take angles in degrees", () => {
    expect(cleanNumber(run("sin", 90))).toBe(1);
    expect(cleanNumber(run("cos", 180))).toBe(-1);
    expect(cleanNumber(run("tan", 45))).toBe(1);
  });

  it("compute roots, absolute values and rounding", () => {
    expect(run("sqrt", 16)).toBe(4);
    expect(run("abs", -3)).toBe(3);
    expect(run("floor", 2.7)).toBe(2);
    expect(run("ceil", 2.1)).toBe(3);
    expect(run("round", 2.5)).toBe(3);
  });

  it("let min and max take any number of values", () => {
    expect(run("min", 4, 2, 8)).toBe(2);
    expect(run("max", 4, 2, 8)).toBe(8);
    expect(BUILTINS_BY_NAME.get("max")!.maxArgs).toBe(Infinity);
  });

  it("index every builtin by name, with unique names", () => {
    expect(BUILTINS_BY_NAME.size).toBe(BUILTIN_FUNCTIONS.length);
  });

  it("describe every builtin for the editor's hover help", () => {
    for (const fn of BUILTIN_FUNCTIONS) {
      expect(fn.description.length).toBeGreaterThan(0);
      expect(fn.minArgs).toBeLessThanOrEqual(fn.maxArgs);
    }
  });
});

describe("cleanNumber", () => {
  it("removes floating-point noise", () => {
    expect(cleanNumber(0.1 + 0.2)).toBe(0.3);
    expect(cleanNumber(Math.cos(Math.PI / 2))).toBe(0);
  });

  it("never returns negative zero", () => {
    expect(Object.is(cleanNumber(-1e-12), 0)).toBe(true);
  });

  it("leaves non-finite values alone so the analyzer can report them", () => {
    expect(cleanNumber(Infinity)).toBe(Infinity);
    expect(cleanNumber(Number.NaN)).toBeNaN();
  });

  it("keeps meaningful decimals", () => {
    expect(cleanNumber(12.345678)).toBe(12.345678);
  });
});
