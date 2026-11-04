import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import assert from "node:assert/strict";

import { Effect } from "effect";

import {
  decodeParticleEngineExports,
  loadParticleEngine,
  ParticleEngineAbiError,
  ParticleEngineBodyError,
  ParticleEngineFetchError,
  ParticleEngineInstantiateError,
} from "./wasm-engine";

const wasmBytes = async () =>
  await Bun.file(
    new URL("../../../../public/wasm/particle-engine.wasm", import.meta.url)
  ).arrayBuffer();

afterEach(() => {
  mock.restore();
});

const respondWith = (bytes: ArrayBuffer) => {
  const request = spyOn(globalThis, "fetch");
  request.mockResolvedValueOnce(new Response(bytes));
  request.mockResolvedValueOnce(new Response(bytes));

  return request;
};

describe("particle engine loading", () => {
  test("validates the artifact and gives each caller fresh memory", async () => {
    respondWith(await wasmBytes());
    const first = await loadParticleEngine(new AbortController().signal);
    const second = await loadParticleEngine(new AbortController().signal);
    expect(first.memory).toBeInstanceOf(WebAssembly.Memory);
    expect(first.memory).not.toBe(second.memory);
    const originalSecondCount = second.particle_count();
    first.initialize(1, 10, 640, 480);
    expect(first.particle_count()).toBe(10);
    expect(second.particle_count()).toBe(originalSecondCount);
    expect(first.perlin_noise_2d(0.25, 0.75)).toBe(
      second.perlin_noise_2d(0.25, 0.75)
    );
  });

  test("rejects every missing or malformed required export", async () => {
    const wasmModule = await WebAssembly.instantiate(await wasmBytes(), {});
    const exports = { ...wasmModule.instance.exports };

    const required = [
      "gpu_frame_command_byte_length",
      "initialize",
      "initialize_gpu_controller",
      "memory",
      "particle_count",
      "perlin_noise_2d",
      "perlin_noise_3d",
      "prepare_gpu_frame",
      "resize",
      "resize_gpu_controller",
      "set_gpu_particle_count",
      "set_particle_count",
      "step",
    ];

    await Promise.all(
      required.map(async (name) => {
        const missing = Object.fromEntries(
          Object.entries(exports).filter(([key]) => key !== name)
        );

        await assert.rejects(
          Effect.runPromise(decodeParticleEngineExports(missing)),
          ParticleEngineAbiError
        );
        await assert.rejects(
          Effect.runPromise(
            decodeParticleEngineExports({ ...exports, [name]: 123 })
          ),
          ParticleEngineAbiError
        );
      })
    );
  });

  test("reports request, body, compilation, and ABI failures separately", async () => {
    const { signal } = new AbortController();
    const request = spyOn(globalThis, "fetch");
    request.mockRejectedValueOnce(new Error("offline"));
    await assert.rejects(loadParticleEngine(signal), ParticleEngineFetchError);
    request.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await assert.rejects(loadParticleEngine(signal), ParticleEngineFetchError);
    const response = new Response();
    spyOn(response, "arrayBuffer").mockRejectedValueOnce(
      new Error("body failed")
    );
    request.mockResolvedValueOnce(response);
    await assert.rejects(loadParticleEngine(signal), ParticleEngineBodyError);
    request.mockResolvedValueOnce(new Response("invalid wasm"));
    await assert.rejects(
      loadParticleEngine(signal),
      ParticleEngineInstantiateError
    );
    request.mockResolvedValueOnce(
      new Response(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]))
    );
    await assert.rejects(loadParticleEngine(signal), ParticleEngineAbiError);
  });

  test("preserves the original abort reason before fetching", async () => {
    const request = respondWith(await wasmBytes());
    const controller = new AbortController();
    const reason = new DOMException("cancelled", "AbortError");
    controller.abort(reason);
    await assert.rejects(
      loadParticleEngine(controller.signal),
      (error) => error === reason
    );
    expect(request).not.toHaveBeenCalled();
  });

  test("checks cancellation after reading the body before instantiation", async () => {
    const controller = new AbortController();
    const reason = new DOMException("cancelled", "AbortError");
    const bytes = await wasmBytes();
    const response = new Response();
    spyOn(response, "arrayBuffer").mockImplementation(async () => {
      controller.abort(reason);

      return await Promise.resolve(bytes);
    });
    spyOn(globalThis, "fetch").mockResolvedValueOnce(response);
    const instantiate = spyOn(WebAssembly, "instantiate");
    await assert.rejects(
      loadParticleEngine(controller.signal),
      (error) => error === reason
    );
    expect(instantiate).not.toHaveBeenCalled();
  });
});
