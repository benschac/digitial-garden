import { describe, expect, test } from "bun:test";

import { Effect } from "effect";

import { perlinNoise2D, perlinNoise3D } from "@/lib/perlin-noise";

import { decodeParticleEngineExports } from "../wasm-canvas/wasm-engine";

describe("Rust/WASM Perlin noise", () => {
  test("matches TypeScript across positive and negative coordinates", async () => {
    const wasmUrl = new URL(
      "../../../../public/wasm/particle-engine.wasm",
      import.meta.url
    );

    const wasmModule = await WebAssembly.instantiate(
      await Bun.file(wasmUrl).arrayBuffer(),
      {}
    );

    const engine = await Effect.runPromise(
      decodeParticleEngineExports(wasmModule.instance.exports)
    );

    const rustNoise = engine.perlin_noise_2d;

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
        Math.abs(perlinNoise2D(x, y) - rustNoise(x, y))
      );
    }

    expect(maximumDifference).toBe(0);
  });

  test("matches TypeScript throughout the 3D field", async () => {
    const wasmUrl = new URL(
      "../../../../public/wasm/particle-engine.wasm",
      import.meta.url
    );

    const wasmModule = await WebAssembly.instantiate(
      await Bun.file(wasmUrl).arrayBuffer(),
      {}
    );

    const engine = await Effect.runPromise(
      decodeParticleEngineExports(wasmModule.instance.exports)
    );

    const rustNoise = engine.perlin_noise_3d;

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
        Math.abs(perlinNoise3D(x, y, z) - rustNoise(x, y, z))
      );
    }

    expect(maximumDifference).toBe(0);
  });
});
