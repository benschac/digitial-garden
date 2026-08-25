import { describe, expect, test } from "bun:test";
import { perlinNoise2D, perlinNoise3D } from "@/lib/perlin-noise";

type PerlinExports = {
  perlin_noise_2d: (x: number, y: number) => number;
  perlin_noise_3d: (x: number, y: number, z: number) => number;
};

describe("Rust/WASM Perlin noise", () => {
  test("matches TypeScript across positive and negative coordinates", async () => {
    const wasmUrl = new URL(
      "../../../../public/wasm/particle-engine.wasm",
      import.meta.url,
    );
    const module = await WebAssembly.instantiate(
      await Bun.file(wasmUrl).arrayBuffer(),
      {},
    );
    const rustNoise = (module.instance.exports as PerlinExports)
      .perlin_noise_2d;
    const coordinates = [
      [0.25, 0.75],
      [-3.125, 7.5],
      [12.875, -4.25],
      [255.5, 256.5],
    ] as const;
    let maximumDifference = 0;

    for (const [x, y] of coordinates) {
      maximumDifference = Math.max(
        maximumDifference,
        Math.abs(perlinNoise2D(x, y) - rustNoise(x, y)),
      );
    }

    expect(maximumDifference).toBe(0);
  });

  test("matches TypeScript throughout the 3D field", async () => {
    const wasmUrl = new URL(
      "../../../../public/wasm/particle-engine.wasm",
      import.meta.url,
    );
    const module = await WebAssembly.instantiate(
      await Bun.file(wasmUrl).arrayBuffer(),
      {},
    );
    const rustNoise = (module.instance.exports as PerlinExports)
      .perlin_noise_3d;
    const coordinates = [
      [0.25, 0.75, 0.5],
      [-3.125, 7.5, -2.25],
      [12.875, -4.25, 9.125],
      [255.5, 256.5, 511.75],
    ] as const;
    let maximumDifference = 0;

    for (const [x, y, z] of coordinates) {
      maximumDifference = Math.max(
        maximumDifference,
        Math.abs(perlinNoise3D(x, y, z) - rustNoise(x, y, z)),
      );
    }

    expect(maximumDifference).toBe(0);
  });
});
