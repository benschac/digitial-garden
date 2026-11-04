import { describe, expect, test } from "bun:test";
import assert from "node:assert/strict";

import { initializeParticleRenderer } from "./particle-initialization";
import type { ParticleRenderer } from "./particle-renderer";

const makeRenderer = (
  kind: ParticleRenderer["kind"],
  destroy: () => void = () => {}
): ParticleRenderer => ({
  destroy,
  kind,
  maxParticleCount: 10,
  render: () => {},
  resize: () => {},
  setParticleCount: (count) => count,
});

const deferred = <T>() => Promise.withResolvers<T>();

describe("particle renderer initialization", () => {
  test("does not start a factory when already aborted", async () => {
    const controller = new AbortController();
    const reason = new Error("Initialization already cancelled");
    let factoryCalls = 0;
    controller.abort(reason);

    await assert.rejects(
      initializeParticleRenderer({
        createFallback: async () => {
          factoryCalls += 1;

          return await Promise.resolve(makeRenderer("WebAssembly + Canvas 2D"));
        },
        createGpu: async () => {
          factoryCalls += 1;

          return await Promise.resolve(null);
        },
        onGpuFailure: () => {},
        signal: controller.signal,
      }),
      (error) => error === reason
    );
    expect(factoryCalls).toBe(0);
  });

  test("returns the GPU renderer without invoking fallback", async () => {
    const gpu = makeRenderer("Rust/WASM + WebGPU");
    let fallbackCalls = 0;
    let failureCalls = 0;

    expect(
      await initializeParticleRenderer({
        createFallback: async () => {
          fallbackCalls += 1;

          return await Promise.resolve(makeRenderer("WebAssembly + Canvas 2D"));
        },
        createGpu: async () => await Promise.resolve(gpu),
        onGpuFailure: () => {
          failureCalls += 1;
        },
        signal: new AbortController().signal,
      })
    ).toBe(gpu);
    expect(fallbackCalls).toBe(0);
    expect(failureCalls).toBe(0);
  });

  test("uses fallback after a GPU failure and reports the original failure", async () => {
    const gpuError = new Error("GPU unavailable");
    const fallback = makeRenderer("WebAssembly + Canvas 2D");
    const reported: unknown[] = [];

    expect(
      await initializeParticleRenderer({
        createFallback: async () => await Promise.resolve(fallback),
        createGpu: async () => await Promise.reject(gpuError),
        onGpuFailure: (error) => {
          reported.push(error);
        },
        signal: new AbortController().signal,
      })
    ).toBe(fallback);
    expect(reported).toEqual([gpuError]);
  });

  test("uses fallback when the GPU factory reports no available renderer", async () => {
    const fallback = makeRenderer("WebAssembly + Canvas 2D");
    let failureCalls = 0;

    expect(
      await initializeParticleRenderer({
        createFallback: async () => await Promise.resolve(fallback),
        createGpu: async () => await Promise.resolve(null),
        onGpuFailure: () => {
          failureCalls += 1;
        },
        signal: new AbortController().signal,
      })
    ).toBe(fallback);
    expect(failureCalls).toBe(0);
  });

  test("does not start fallback after abort during GPU initialization", async () => {
    const controller = new AbortController();
    const reason = new Error("GPU initialization cancelled");
    const started = deferred<undefined>();
    let fallbackCalls = 0;
    let failureCalls = 0;

    const initialization = initializeParticleRenderer({
      createFallback: async () => {
        fallbackCalls += 1;

        return await Promise.resolve(makeRenderer("WebAssembly + Canvas 2D"));
      },
      createGpu: async (signal) => {
        started.resolve(undefined);

        const pending = Promise.withResolvers<null>();
        signal.addEventListener(
          "abort",
          () => {
            pending.reject(signal.reason);
          },
          {
            once: true,
          }
        );

        return await pending.promise;
      },
      onGpuFailure: () => {
        failureCalls += 1;
      },
      signal: controller.signal,
    });

    await started.promise;
    controller.abort(reason);

    await assert.rejects(initialization, (error) => error === reason);
    expect(fallbackCalls).toBe(0);
    expect(failureCalls).toBe(0);
  });

  test("destroys a GPU renderer that arrives after abort and skips fallback", async () => {
    const controller = new AbortController();
    const reason = new Error("GPU initialization cancelled");
    const gpu = deferred<ParticleRenderer | null>();
    const started = deferred<undefined>();
    let destroyCount = 0;
    let fallbackCalls = 0;

    const initialization = initializeParticleRenderer({
      createFallback: async () => {
        fallbackCalls += 1;

        return await Promise.resolve(makeRenderer("WebAssembly + Canvas 2D"));
      },
      createGpu: async () => {
        started.resolve(undefined);

        return await gpu.promise;
      },
      onGpuFailure: () => {},
      signal: controller.signal,
    });

    await started.promise;
    controller.abort(reason);
    gpu.resolve(
      makeRenderer("Rust/WASM + WebGPU", () => {
        destroyCount += 1;
      })
    );

    await assert.rejects(initialization, (error) => error === reason);
    expect(destroyCount).toBe(1);
    expect(fallbackCalls).toBe(0);
  });

  test("destroys a fallback renderer that arrives after abort", async () => {
    const controller = new AbortController();
    const reason = new Error("Fallback initialization cancelled");
    const fallback = deferred<ParticleRenderer>();
    const started = deferred<undefined>();
    let destroyCount = 0;

    const initialization = initializeParticleRenderer({
      createFallback: async () => {
        started.resolve(undefined);

        return await fallback.promise;
      },
      createGpu: async () => await Promise.resolve(null),
      onGpuFailure: () => {},
      signal: controller.signal,
    });

    await started.promise;
    controller.abort(reason);
    fallback.resolve(
      makeRenderer("WebAssembly + Canvas 2D", () => {
        destroyCount += 1;
      })
    );

    await assert.rejects(initialization, (error) => error === reason);
    expect(destroyCount).toBe(1);
  });

  test("preserves fallback failure after reporting the GPU failure", async () => {
    const gpuError = new Error("GPU unavailable");
    const fallbackError = new Error("WASM unavailable");
    const reported: unknown[] = [];

    await assert.rejects(
      initializeParticleRenderer({
        createFallback: async () => await Promise.reject(fallbackError),
        createGpu: async () => await Promise.reject(gpuError),
        onGpuFailure: (error) => {
          reported.push(error);
        },
        signal: new AbortController().signal,
      }),
      (error) => error === fallbackError
    );
    expect(reported).toEqual([gpuError]);
  });
  test("initial setup failure disposes the renderer without starting fallback", async () => {
    const error = new Error("Initial count failed");
    let destroys = 0;
    let fallbacks = 0;
    await assert.rejects(
      initializeParticleRenderer({
        configure: () => {
          throw error;
        },
        createFallback: async () => {
          fallbacks += 1;

          return await Promise.resolve(makeRenderer("WebAssembly + Canvas 2D"));
        },
        createGpu: async () =>
          await Promise.resolve(
            makeRenderer("Rust/WASM + WebGPU", () => {
              destroys += 1;
            })
          ),
        onGpuFailure: () => {},
        signal: new AbortController().signal,
      }),
      (rejection) => rejection === error
    );
    expect(destroys).toBe(1);
    expect(fallbacks).toBe(0);
  });
});
