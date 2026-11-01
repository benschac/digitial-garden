import { describe, expect, test } from "bun:test";

import type { ParticleRenderer } from "./particle-renderer";
import { createRendererScope, withRendererScope } from "./renderer-lifecycle";

const makeRenderer = (destroy: () => void): ParticleRenderer => ({
  destroy,
  kind: "Rust/WASM + WebGPU",
  maxParticleCount: 10,
  render: () => {},
  resize: () => {},
  setParticleCount: (count) => count,
});

const deferred = <T>() => Promise.withResolvers<T>();

describe("renderer lifecycle", () => {
  test("releases partial synchronous acquisitions when a later acquisition throws", () => {
    const scope = createRendererScope();
    const released: string[] = [];

    scope.acquire(
      () => "device",
      (resource) => released.push(resource)
    );
    expect(() =>
      scope.acquire(
        () => {
          throw new Error("Buffer allocation failed");
        },
        () => {}
      )
    ).toThrow("Buffer allocation failed");

    scope.close();
    expect(released).toEqual(["device"]);
  });

  test("releases earlier resources when an asynchronous shader step rejects", async () => {
    const released: string[] = [];

    await expect(
      withRendererScope(new AbortController().signal, async (activeScope) => {
        activeScope.acquire(
          () => "device",
          (resource) => released.push(resource)
        );
        activeScope.acquire(
          () => "buffer",
          (resource) => released.push(resource)
        );
        await activeScope.acquirePromise(
          () => Promise.reject(new Error("Shader compilation failed")),
          () => {}
        );

        return null;
      })
    ).rejects.toThrow();

    expect(released).toEqual(["buffer", "device"]);
  });

  test("closes resources when initialization returns null", async () => {
    const released: string[] = [];

    const renderer = await withRendererScope(
      new AbortController().signal,
      (scope) => {
        scope.acquire(
          () => "device",
          (resource) => released.push(resource)
        );

        return Promise.resolve(null);
      }
    );

    expect(renderer).toBeNull();
    expect(released).toEqual(["device"]);
  });

  test("keeps the renderer alive until destroy and releases it exactly once", async () => {
    let destroyCount = 0;

    const renderer = await withRendererScope(new AbortController().signal, () =>
      Promise.resolve(
        makeRenderer(() => {
          destroyCount += 1;
        })
      )
    );

    expect(renderer).not.toBeNull();
    expect(destroyCount).toBe(0);
    renderer?.destroy();
    renderer?.destroy();
    expect(destroyCount).toBe(1);
  });

  test("preserves the initialization error when resource cleanup also throws", async () => {
    const initializationError = new Error("Shader setup failed");

    await expect(
      withRendererScope(new AbortController().signal, (scope) => {
        scope.acquire(
          () => "device",
          () => {
            throw new Error("Device cleanup failed");
          }
        );

        return Promise.reject(initializationError);
      })
    ).rejects.toBe(initializationError);
  });

  test("disposes a resource that resolves after the owning initialization is aborted", async () => {
    const controller = new AbortController();
    const reason = new Error("Initialization cancelled");
    const resource = deferred<string>();
    const started = deferred<undefined>();
    const released: string[] = [];
    let rendererDestroyCount = 0;

    const initialization = withRendererScope(
      controller.signal,
      async (scope) => {
        await scope.acquirePromise(
          () => {
            started.resolve(undefined);

            return resource.promise;
          },
          (value) => released.push(value)
        );

        return makeRenderer(() => (rendererDestroyCount += 1));
      }
    );

    await started.promise;
    controller.abort(reason);
    resource.resolve("late-device");

    await expect(initialization).rejects.toBe(reason);
    expect(released).toEqual(["late-device"]);
    expect(rendererDestroyCount).toBe(0);
  });
});
