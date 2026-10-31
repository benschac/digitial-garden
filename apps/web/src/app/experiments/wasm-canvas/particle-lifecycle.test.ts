import { describe, expect, test } from "bun:test";

import { Effect } from "effect";

import { createParticleLifecycle } from "./particle-lifecycle";
import type { ParticleAvailability } from "./particle-lifecycle";
import type { ParticleRenderer } from "./particle-renderer";

const deferred = <T>() => Promise.withResolvers<T>();

const until = (predicate: () => boolean) =>
  Effect.runPromise(
    Effect.sleep(1).pipe(
      Effect.repeat({ while: () => !predicate() }),
      Effect.timeout(1000)
    )
  );

const fixture = (
  overrides: Partial<Parameters<typeof createParticleLifecycle>[0]> = {}
) => {
  const calls = { count: 0, destroy: 0, fallback: 0, render: 0, resize: 0 };
  const history: ParticleAvailability[] = [];
  const animations: boolean[] = [];

  let lose: ((message: string) => void) | undefined;

  const renderer: ParticleRenderer = {
    destroy: () => {
      calls.destroy += 1;
    },
    kind: "Rust/WASM + WebGPU",
    maxParticleCount: 100,
    render: () => {
      calls.render += 1;
    },
    resize: () => {
      calls.resize += 1;
    },
    setParticleCount: (count) => {
      calls.count += 1;

      return count;
    },
  };

  const controller = createParticleLifecycle({
    configure: (acquired) => {
      acquired.resize(10, 10, 1);
      acquired.setParticleCount(10);
    },
    createFallback: () => {
      calls.fallback += 1;

      return Promise.resolve(renderer);
    },
    createGpu: (_signal, lost) => {
      lose = lost;

      return Promise.resolve(renderer);
    },
    onAnimationChange: (animate) => {
      animations.push(animate);
    },
    onGpuFailure: () => {},
    onState: (state) => {
      history.push(state);
    },
    signal: new AbortController().signal,
    ...overrides,
  });

  return {
    animations,
    calls,
    controller,
    history,
    lose: (message = "device lost") => lose?.(message),
    renderer,
  };
};

const frame = {
  deltaSeconds: 0.01,
  elapsedSeconds: 1,
  interaction: 1,
  pointerX: 1,
  pointerY: 1,
  simulationSpeed: 1,
};

describe("particle lifecycle", () => {
  test("keeps successful renderer alive beyond invocation completion and destroys once on teardown", async () => {
    const f = fixture();
    await until(() => f.controller.availability === "ready");
    expect(f.calls.destroy).toBe(0);
    f.controller.render(frame);
    expect(f.calls.render).toBe(1);
    await f.controller.dispose();
    await f.controller.dispose();
    expect(f.calls.destroy).toBe(1);
    expect(f.history).toEqual(["ready", "disposed"]);
    expect(f.animations).toEqual([true, false]);
  });

  test("loss synchronously blocks every native operation and cannot be resumed", async () => {
    const f = fixture();
    await until(() => f.controller.availability === "ready");
    f.lose();
    f.controller.setEligibility({
      hidden: false,
      paused: false,
      reducedMotion: false,
      visible: true,
    });
    f.controller.render(frame);
    f.controller.resize(20, 20, 2);
    f.controller.setParticleCount(50);
    expect(f.controller.canAnimate()).toBe(false);
    expect(f.calls).toEqual({
      count: 1,
      destroy: 1,
      fallback: 0,
      render: 0,
      resize: 1,
    });
    await until(() => f.controller.availability === "lost");
    await f.controller.dispose();
    expect(f.calls.destroy).toBe(1);
    expect(f.history).toEqual(["ready", "lost", "disposed"]);
  });

  test("loss during acquisition rejects late readiness and destroys the late renderer", async () => {
    const pending = deferred<ParticleRenderer | null>();
    let lost: ((message: string) => void) | undefined;

    const f = fixture({
      createGpu: (_signal, onLost) => {
        lost = onLost;

        return pending.promise;
      },
    });

    await until(() => lost !== undefined);
    lost?.("lost before ready");
    pending.resolve(f.renderer);
    await until(
      () => f.calls.destroy === 1 && f.controller.availability === "lost"
    );
    expect(f.calls.resize).toBe(0);
    expect(f.calls.fallback).toBe(0);
    expect(f.history).toEqual(["lost"]);
    await f.controller.dispose();
    expect(f.calls.destroy).toBe(1);
  });

  test("reports fallback before readiness without treating GPU absence as failure", async () => {
    const fallback = deferred<ParticleRenderer>();

    const f = fixture({
      createFallback: () => fallback.promise,
      createGpu: () => Promise.resolve(null),
    });

    await until(() => f.controller.availability === "fallback");
    fallback.resolve(f.renderer);
    await until(() => f.controller.availability === "ready");
    expect(f.history).toEqual(["fallback", "ready"]);
    await f.controller.dispose();
  });

  test("setup exceptions release the acquired renderer and do not attempt fallback", async () => {
    const f = fixture({
      configure: () => {
        throw new Error("resize failed");
      },
    });

    await until(() => f.controller.availability === "failed");
    expect(f.calls.destroy).toBe(1);
    expect(f.calls.fallback).toBe(0);
    await f.controller.dispose();
    expect(f.calls.destroy).toBe(1);
  });

  test("abort and replay isolate late acquisitions from the replacement owner", async () => {
    const abort = new AbortController();
    const pending = deferred<ParticleRenderer | null>();
    let started = false;

    const first = fixture({
      createGpu: () => {
        started = true;

        return pending.promise;
      },
      signal: abort.signal,
    });

    await until(() => started);
    abort.abort();
    const second = fixture();
    pending.resolve(first.renderer);
    await until(
      () =>
        first.calls.destroy === 1 && second.controller.availability === "ready"
    );
    expect(first.calls.fallback).toBe(0);
    expect(first.history).not.toContain("ready");
    expect(second.calls.destroy).toBe(0);
    await first.controller.dispose();
    await second.controller.dispose();
    expect(first.calls.destroy).toBe(1);
    expect(second.calls.destroy).toBe(1);
  });

  test("user pause survives visibility and reduced motion prevents restart", async () => {
    const f = fixture();
    await until(() => f.controller.availability === "ready");
    expect(f.controller.canAnimate()).toBe(true);
    f.controller.setEligibility({ paused: true });
    f.controller.setEligibility({ hidden: true });
    f.controller.setEligibility({ hidden: false });
    expect(f.controller.canAnimate()).toBe(false);
    f.controller.setEligibility({ paused: false, reducedMotion: true });
    f.controller.setEligibility({ visible: false });
    f.controller.setEligibility({ visible: true });
    expect(f.controller.canAnimate()).toBe(false);
    f.controller.render(frame);
    expect(f.calls.render).toBe(1);
    f.controller.setEligibility({ reducedMotion: false });
    expect(f.controller.canAnimate()).toBe(true);
    await f.controller.dispose();
  });
  test("an already aborted owner does not start acquisition", async () => {
    const abort = new AbortController();
    abort.abort();
    let started = false;

    const f = fixture({
      createGpu: () => {
        started = true;

        return Promise.resolve(null);
      },
      signal: abort.signal,
    });

    await f.controller.dispose();
    expect(started).toBe(false);
    expect(f.history).toEqual(["disposed"]);
  });

  test("loss during initial resize prevents initial count and ready publication", async () => {
    let lose: ((message: string) => void) | undefined;
    const pending = deferred<ParticleRenderer | null>();

    const f = fixture({
      configure: (renderer, signal) => {
        renderer.resize(10, 10, 1);
        lose?.("lost during resize");
        signal.throwIfAborted();
        renderer.setParticleCount(10);
      },
      createGpu: (_signal, onLost) => {
        lose = onLost;

        return pending.promise;
      },
    });

    pending.resolve(f.renderer);
    await until(
      () => f.controller.availability === "lost" && f.calls.destroy === 1
    );
    expect(f.calls.count).toBe(0);
    expect(f.history).not.toContain("ready");
    await f.controller.dispose();
    expect(f.calls.destroy).toBe(1);
  });

  test("fallback failure becomes failed and retains the error for presentation", async () => {
    const failure = new Error("fallback failed");
    const details: (Error | string | undefined)[] = [];

    const f = fixture({
      createFallback: () => Promise.reject(failure),
      createGpu: () => Promise.resolve(null),
      onState: (state, detail) => {
        if (state === "failed") {
          details.push(detail);
        }
      },
    });

    await until(() => f.controller.availability === "failed");
    expect(details).toEqual([failure]);
    expect(f.controller.canAnimate()).toBe(false);
    await f.controller.dispose();
  });

  test("normalizes non-Error initialization failures and retains their cause", async () => {
    const cause = { reason: "fallback unavailable" };
    const details: (Error | string | undefined)[] = [];

    const f = fixture({
      createFallback: () => Promise.reject(cause),
      createGpu: () => Promise.resolve(null),
      onState: (state, detail) => {
        if (state === "failed") {
          details.push(detail);
        }
      },
    });

    await until(() => f.controller.availability === "failed");
    expect(details).toHaveLength(1);
    expect(details[0]).toBeInstanceOf(Error);
    expect(details[0]).toEqual(
      new Error("Particle initialization failed.", { cause })
    );
    expect(f.controller.canAnimate()).toBe(false);
    await f.controller.dispose();
  });
});
