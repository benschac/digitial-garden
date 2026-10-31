import { describe, expect, test } from "bun:test";

import { createRendererScope } from "./experiments/wasm-canvas/renderer-lifecycle";
import {
  createWetInkTextureSlot,
  withWetInkResources,
} from "./wet-ink-resources";

describe("wet ink initialization ownership", () => {
  test("does not start acquisition after cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    let started = false;

    const renderer = await withWetInkResources(controller.signal, () => {
      started = true;

      return Promise.resolve({});
    });

    expect(renderer).toBeNull();
    expect(started).toBe(false);
  });

  test("a font failure prevents GPU acquisition", async () => {
    const failure = new Error("Fonts unavailable");
    const acquired: string[] = [];
    await expect(
      withWetInkResources(new AbortController().signal, async (owner) => {
        await Promise.reject(failure);
        owner.acquire(
          () => acquired.push("gpu"),
          () => {}
        );

        return {};
      })
    ).rejects.toBe(failure);
    expect(acquired).toEqual([]);
  });

  for (const stage of ["gpu", "surface", "shader", "compile", "resize"]) {
    test(`releases earlier allocations when ${stage} fails`, async () => {
      const released: string[] = [];
      await expect(
        withWetInkResources(new AbortController().signal, async (owner) => {
          for (const allocation of ["gpu", "surface", "shader"]) {
            owner.acquire(
              () => {
                if (stage === allocation) {
                  throw new Error(`${stage} failed`);
                }

                return allocation;
              },
              (resource) => released.push(resource)
            );
          }

          if (stage === "compile") {
            await Promise.reject(new Error("compile failed"));
          }

          const texture = createWetInkTextureSlot<string>(owner, (resource) =>
            released.push(resource)
          );

          texture.replace(
            () => "texture",
            () => {
              throw new Error("resize failed");
            },
            () => {}
          );

          return {};
        })
      ).rejects.toThrow(`${stage} failed`);
      const acquired = ["gpu", "surface", "shader", "texture"];
      const count = stage === "compile" ? 3 : acquired.indexOf(stage);
      expect(released).toEqual(
        (stage === "resize" ? acquired : acquired.slice(0, count)).toReversed()
      );
    });
  }

  test("keeps successful allocations alive until exactly one destruction", async () => {
    const released: string[] = [];

    const renderer = await withWetInkResources(
      new AbortController().signal,
      (owner) => {
        for (const resource of ["gpu", "surface", "shader"]) {
          owner.acquire(
            () => resource,
            (value) => released.push(value)
          );
        }

        const texture = createWetInkTextureSlot<string>(owner, (value) =>
          released.push(value)
        );

        texture.replace(
          () => "texture",
          () => {},
          () => {}
        );

        return Promise.resolve({ render: () => "drawn" });
      }
    );

    expect(released).toEqual([]);
    expect(renderer?.render()).toBe("drawn");
    renderer?.destroy();
    renderer?.destroy();
    expect(released).toEqual(["texture", "shader", "surface", "gpu"]);
  });

  test("disposes GPU acquisition that completes after abort without starting a surface", async () => {
    const controller = new AbortController();
    const gpu = Promise.withResolvers<string>();
    const started = Promise.withResolvers<undefined>();
    const released: string[] = [];
    let surfaceStarted = false;

    const initialization = withWetInkResources(
      controller.signal,
      async (owner) => {
        await owner.acquirePromise(
          () => {
            started.resolve(undefined);

            return gpu.promise;
          },
          (resource) => released.push(resource)
        );
        surfaceStarted = true;

        return {};
      }
    );

    await started.promise;
    controller.abort();
    expect(released).toEqual([]);
    gpu.resolve("late-gpu");
    expect(await initialization).toBeNull();
    expect(surfaceStarted).toBe(false);
    expect(released).toEqual(["late-gpu"]);
  });

  test("waits for nonabortable compilation then closes its acquired resources", async () => {
    const controller = new AbortController();
    const compile = Promise.withResolvers<undefined>();
    const started = Promise.withResolvers<undefined>();
    const released: string[] = [];

    const initialization = withWetInkResources(
      controller.signal,
      async (owner) => {
        for (const resource of ["gpu", "surface", "shader"]) {
          owner.acquire(
            () => resource,
            (value) => released.push(value)
          );
        }

        started.resolve(undefined);
        await compile.promise;
        controller.signal.throwIfAborted();

        return {};
      }
    );

    await started.promise;
    controller.abort();
    expect(released).toEqual([]);
    compile.resolve(undefined);
    expect(await initialization).toBeNull();
    expect(released).toEqual(["shader", "surface", "gpu"]);
  });

  test("releases all resources when one finalizer throws and preserves setup failure", async () => {
    const released: string[] = [];
    const failure = new Error("Initial resize failed");
    await expect(
      withWetInkResources(new AbortController().signal, (owner) => {
        for (const resource of ["gpu", "surface", "shader"]) {
          owner.acquire(
            () => resource,
            (value) => {
              released.push(value);

              if (value === "shader") {
                throw new Error("Disposal failed");
              }
            }
          );
        }

        return Promise.reject(failure);
      })
    ).rejects.toBe(failure);
    expect(released).toEqual(["shader", "surface", "gpu"]);
  });
});

describe("wet ink texture replacement", () => {
  test("does not prepare a texture when allocation closes its owner", () => {
    const owner = createRendererScope();
    const released: string[] = [];

    const texture = createWetInkTextureSlot<string>(owner, (value) =>
      released.push(value)
    );

    let prepared = false;

    expect(() =>
      texture.replace(
        () => {
          owner.close();

          return "candidate";
        },
        () => {
          prepared = true;
        },
        () => {}
      )
    ).toThrow("Wet ink resources are closed.");
    expect(prepared).toBe(false);
    expect(released).toEqual(["candidate"]);
    owner.close();
    expect(released).toEqual(["candidate"]);
  });

  test("preserves preparation failure when rollback and candidate cleanup both throw", () => {
    const owner = createRendererScope();
    const released: string[] = [];

    const texture = createWetInkTextureSlot<string>(owner, (value) => {
      released.push(value);

      if (value === "candidate") {
        throw new Error("Candidate cleanup failed");
      }
    });

    texture.replace(
      () => "previous",
      () => {},
      () => {}
    );
    const failure = new Error("Preparation failed");

    expect(() =>
      texture.replace(
        () => "candidate",
        () => {
          throw failure;
        },
        () => {
          throw new Error("Rollback failed");
        }
      )
    ).toThrow(failure);
    expect(released).toEqual(["candidate"]);
    owner.close();
    expect(released).toEqual(["candidate", "previous"]);
  });

  test("destroys the initial texture when setup fails without a previous mask", () => {
    const owner = createRendererScope();
    const released: string[] = [];

    const texture = createWetInkTextureSlot<string>(owner, (value) =>
      released.push(value)
    );

    let restored = false;

    expect(() =>
      texture.replace(
        () => "initial",
        () => {
          throw new Error("Initial binding failed");
        },
        () => {
          restored = true;
        }
      )
    ).toThrow("Initial binding failed");
    expect(released).toEqual(["initial"]);
    expect(restored).toBe(false);
    owner.close();
    expect(released).toEqual(["initial"]);
  });

  for (const stage of ["copy", "resize", "bind"]) {
    test(`keeps the previous texture usable and destroys a candidate after ${stage} fails`, () => {
      const owner = createRendererScope();
      const released: string[] = [];

      const texture = createWetInkTextureSlot<string>(owner, (value) =>
        released.push(value)
      );

      let bound = "none";
      let size = "none";

      const bind = (value: string) => {
        bound = value;
        size = value;
      };

      texture.replace(() => "previous", bind, bind);
      expect(() =>
        texture.replace(
          () => "candidate",
          (value) => {
            if (stage === "copy") {
              throw new Error("copy failed");
            }

            size = value;

            if (stage === "resize") {
              throw new Error("resize failed");
            }

            bound = value;
            throw new Error("bind failed");
          },
          bind
        )
      ).toThrow(`${stage} failed`);
      expect(bound).toBe("previous");
      expect(size).toBe("previous");
      expect(released).toEqual(["candidate"]);
      owner.close();
      expect(released).toEqual(["candidate", "previous"]);
    });
  }

  test("retires superseded textures immediately and destroys only the current one at close", () => {
    const owner = createRendererScope();
    const released: number[] = [];

    const texture = createWetInkTextureSlot<number>(owner, (value) =>
      released.push(value)
    );

    for (let index = 0; index < 20; index += 1) {
      texture.replace(
        () => index,
        () => expect(released).not.toContain(index - 1),
        () => {}
      );
      expect(released).toEqual(
        Array.from({ length: index }, (_, value) => value)
      );
    }

    owner.close();
    owner.close();
    expect(released).toEqual(Array.from({ length: 20 }, (_, value) => value));
  });

  test("preserves setup failure and disposes the candidate when rollback also fails", () => {
    const owner = createRendererScope();
    const released: string[] = [];

    const texture = createWetInkTextureSlot<string>(owner, (value) =>
      released.push(value)
    );

    texture.replace(
      () => "previous",
      () => {},
      () => {}
    );
    const failure = new Error("Binding failed");
    expect(() =>
      texture.replace(
        () => "candidate",
        () => {
          throw failure;
        },
        () => {
          throw new Error("Rollback failed");
        }
      )
    ).toThrow(failure);
    expect(released).toEqual(["candidate"]);
    owner.close();
    expect(released).toEqual(["candidate", "previous"]);
  });

  test("keeps a committed candidate owned when retirement of the previous texture throws", () => {
    const owner = createRendererScope();
    const released: string[] = [];

    const texture = createWetInkTextureSlot<string>(owner, (value) => {
      released.push(value);

      if (value === "previous") {
        throw new Error("Retirement failed");
      }
    });

    texture.replace(
      () => "previous",
      () => {},
      () => {}
    );
    expect(() =>
      texture.replace(
        () => "candidate",
        () => {},
        () => {}
      )
    ).toThrow("Retirement failed");
    expect(released).toEqual(["previous"]);
    owner.close();
    owner.close();
    expect(released).toEqual(["previous", "candidate"]);
  });

  test("does not allocate a texture after its owner closes", () => {
    const owner = createRendererScope();
    const texture = createWetInkTextureSlot<number>(owner, () => {});
    owner.close();
    let allocated = false;
    expect(() =>
      texture.replace(
        () => {
          allocated = true;

          return 1;
        },
        () => {},
        () => {}
      )
    ).toThrow("Wet ink resources are closed.");
    expect(allocated).toBe(false);
  });

  test("releases a texture when its owner closes during preparation", () => {
    const owner = createRendererScope();
    const released: string[] = [];

    const texture = createWetInkTextureSlot<string>(owner, (value) =>
      released.push(value)
    );

    expect(() =>
      texture.replace(
        () => "candidate",
        () => owner.close(),
        () => {}
      )
    ).toThrow("Wet ink resources are closed.");
    expect(released).toEqual(["candidate"]);
    owner.close();
    expect(released).toEqual(["candidate"]);
  });
});
