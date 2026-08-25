import { describe, expect, test } from "bun:test";
import { perlinNoise2D, perlinNoise3D } from "./perlin-noise";

describe("perlinNoise2D", () => {
  test("returns zero at integer lattice coordinates", () => {
    expect(perlinNoise2D(-3, 7)).toBe(0);
  });

  test("matches the shared TypeScript and Rust reference vector", () => {
    expect(perlinNoise2D(0.25, 0.75)).toBeCloseTo(-0.2553577423095703, 14);
  });

  test("wraps gradients every 256 lattice cells", () => {
    expect(perlinNoise2D(12.125, -4.5)).toBeCloseTo(
      perlinNoise2D(268.125, 251.5),
      14,
    );
  });

  test("returns NaN for a non-finite coordinate", () => {
    expect(perlinNoise2D(Number.POSITIVE_INFINITY, 0)).toBeNaN();
  });
});

describe("perlinNoise3D", () => {
  test("returns zero at integer lattice coordinates", () => {
    expect(perlinNoise3D(-3, 7, 11)).toBe(0);
  });

  test("wraps gradients every 256 lattice cells", () => {
    expect(perlinNoise3D(12.125, -4.5, 9.75)).toBeCloseTo(
      perlinNoise3D(268.125, 251.5, 265.75),
      14,
    );
  });

  test("returns NaN for a non-finite coordinate", () => {
    expect(perlinNoise3D(0, Number.NEGATIVE_INFINITY, 0)).toBeNaN();
  });
});
