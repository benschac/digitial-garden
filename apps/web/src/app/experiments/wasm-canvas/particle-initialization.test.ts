import { describe, expect, test } from "bun:test";

import { initializeParticleRenderer } from "./particle-initialization";
import type { ParticleRenderer } from "./particle-renderer";

function makeRenderer(
  kind: ParticleRenderer["kind"],
  destroy: () => void = () => undefined
): ParticleRenderer {
  return {
    destroy,
    kind,
    maxParticleCount: 10,
    render: () => undefined,
    resize: () => undefined,
    setParticleCount: (count) => count,
  };
}

function deferred<T>() {
  let resolveValue: (value: T) => void = () => {
    throw new Error("Deferred value was not initialized.");
  };
  const promise = new Promise<T>((resolve) => {
    resolveValue = resolve;
  });
  return { promise, resolve: resolveValue };
}

describe("particle renderer initialization", () => {
  test("does not start a factory when already aborted", async () => {
    const controller = new AbortController();
    const reason = new Error("Initialization already cancelled");
    let factoryCalls = 0;
    controller.abort(reason);

    await expect(
      initializeParticleRenderer({
        signal: controller.signal,
        createGpu: async () => {
          factoryCalls += 1;
          return null;
        },
        createFallback: async () => {
          factoryCalls += 1;
          return makeRenderer("WebAssembly + Canvas 2D");
        },
        onGpuFailure: () => undefined,
      })
    ).rejects.toBe(reason);
    expect(factoryCalls).toBe(0);
  });

  test("returns the GPU renderer without invoking fallback", async () => {
    const gpu = makeRenderer("Rust/WASM + WebGPU");
    let fallbackCalls = 0;
    let failureCalls = 0;

    await expect(
      initializeParticleRenderer({
        signal: new AbortController().signal,
        createGpu: async () => gpu,
        createFallback: async () => {
          fallbackCalls += 1;
          return makeRenderer("WebAssembly + Canvas 2D");
        },
        onGpuFailure: () => failureCalls++,
      })
    ).resolves.toBe(gpu);
    expect(fallbackCalls).toBe(0);
    expect(failureCalls).toBe(0);
  });

  test("uses fallback after a GPU failure and reports the original failure", async () => {
    const gpuError = new Error("GPU unavailable");
    const fallback = makeRenderer("WebAssembly + Canvas 2D");
    const reported: unknown[] = [];

    await expect(
      initializeParticleRenderer({
        signal: new AbortController().signal,
        createGpu: async () => {
          throw gpuError;
        },
        createFallback: async () => fallback,
        onGpuFailure: (error) => reported.push(error),
      })
    ).resolves.toBe(fallback);
    expect(reported).toEqual([gpuError]);
  });

  test("uses fallback when the GPU factory reports no available renderer", async () => {
    const fallback = makeRenderer("WebAssembly + Canvas 2D");
    let failureCalls = 0;

    await expect(
      initializeParticleRenderer({
        signal: new AbortController().signal,
        createGpu: async () => null,
        createFallback: async () => fallback,
        onGpuFailure: () => failureCalls++,
      })
    ).resolves.toBe(fallback);
    expect(failureCalls).toBe(0);
  });

  test("does not start fallback after abort during GPU initialization", async () => {
    const controller = new AbortController();
    const reason = new Error("GPU initialization cancelled");
    const started = deferred<undefined>();
    let fallbackCalls = 0;
    let failureCalls = 0;
    const initialization = initializeParticleRenderer({
      signal: controller.signal,
      createGpu: (signal) => {
        started.resolve(undefined);
        return new Promise<null>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        });
      },
      createFallback: async () => {
        fallbackCalls += 1;
        return makeRenderer("WebAssembly + Canvas 2D");
      },
      onGpuFailure: () => failureCalls++,
    });

    await started.promise;
    controller.abort(reason);

    await expect(initialization).rejects.toBe(reason);
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
      signal: controller.signal,
      createGpu: () => {
        started.resolve(undefined);
        return gpu.promise;
      },
      createFallback: async () => {
        fallbackCalls += 1;
        return makeRenderer("WebAssembly + Canvas 2D");
      },
      onGpuFailure: () => undefined,
    });

    await started.promise;
    controller.abort(reason);
    gpu.resolve(makeRenderer("Rust/WASM + WebGPU", () => destroyCount++));

    await expect(initialization).rejects.toBe(reason);
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
      signal: controller.signal,
      createGpu: async () => null,
      createFallback: () => {
        started.resolve(undefined);
        return fallback.promise;
      },
      onGpuFailure: () => undefined,
    });

    await started.promise;
    controller.abort(reason);
    fallback.resolve(
      makeRenderer("WebAssembly + Canvas 2D", () => destroyCount++)
    );

    await expect(initialization).rejects.toBe(reason);
    expect(destroyCount).toBe(1);
  });

  test("preserves fallback failure after reporting the GPU failure", async () => {
    const gpuError = new Error("GPU unavailable");
    const fallbackError = new Error("WASM unavailable");
    const reported: unknown[] = [];

    await expect(
      initializeParticleRenderer({
        signal: new AbortController().signal,
        createGpu: async () => {
          throw gpuError;
        },
        createFallback: async () => {
          throw fallbackError;
        },
        onGpuFailure: (error) => reported.push(error),
      })
    ).rejects.toBe(fallbackError);
    expect(reported).toEqual([gpuError]);
  });
  test("initial setup failure disposes the renderer without starting fallback", async () => {
    const error = new Error("Initial count failed");
    let destroys = 0;
    let fallbacks = 0;
    await expect(
      initializeParticleRenderer({
        configure: () => {
          throw error;
        },
        createFallback: () => {
          fallbacks += 1;

          return Promise.resolve(makeRenderer("WebAssembly + Canvas 2D"));
        },
        createGpu: () =>
          Promise.resolve(
            makeRenderer("Rust/WASM + WebGPU", () => {
              destroys += 1;
            })
          ),
        onGpuFailure: () => {},
        signal: new AbortController().signal,
      })
    ).rejects.toBe(error);
    expect(destroys).toBe(1);
    expect(fallbacks).toBe(0);
  });
});
