import { afterEach, describe, expect, test } from "bun:test";

import { Effect, Exit } from "effect";

import {
  watchWasm,
  type WatchWasmDependencies,
  type WatchWasmSignal,
} from "./watch-wasm-lifecycle";

function createProcess() {
  const completion = Promise.withResolvers<number>();
  return {
    exited: completion.promise,
    finish: completion.resolve,
    fail: completion.reject,
    kills: 0,
    kill() {
      this.kills += 1;
      completion.resolve(143);
    },
  };
}

const cleanups: Array<() => Promise<unknown>> = [];

function createHarness(
  options: {
    failWatch?: number;
    failSpawn?: number;
    failSignal?: WatchWasmSignal;
    failClose?: number;
  } = {},
) {
  const watchers: Array<{ change(): void; closes: number; close(): void }> = [];
  const processes: Array<ReturnType<typeof createProcess>> = [];
  const signals = new Map<WatchWasmSignal, () => void>();
  const removed: WatchWasmSignal[] = [];
  const logs: string[] = [];
  const errors: string[] = [];
  const controller = new AbortController();
  let spawns = 0;
  const dependencies: WatchWasmDependencies = {
    targets: [
      { path: "src", recursive: true },
      { path: "Cargo.toml", recursive: false },
      { path: "Cargo.lock", recursive: false },
    ],
    watch: (_target, change) => {
      const index = watchers.length;
      if (index === options.failWatch) throw new Error("cannot watch");
      const watcher = {
        change,
        closes: 0,
        close() {
          this.closes += 1;
          if (index === options.failClose) throw new Error("cannot close");
        },
      };
      watchers.push(watcher);
      return watcher;
    },
    spawn: () => {
      spawns += 1;
      if (spawns === options.failSpawn) throw new Error("cannot spawn");
      const process = createProcess();
      processes.push(process);
      return process;
    },
    onSignal: (signal, listener) => {
      if (signal === options.failSignal)
        throw new Error("cannot register signal");
      signals.set(signal, listener);
    },
    offSignal: (signal, listener) => {
      expect(signals.get(signal)).toBe(listener);
      signals.delete(signal);
      removed.push(signal);
    },
    log: (message) => logs.push(message),
    error: (message) => errors.push(message),
    watchingMessage: "Watching Rust…",
  };
  const result = Effect.runPromiseExit(watchWasm(dependencies), {
    signal: controller.signal,
  });
  const harness = {
    watchers,
    processes,
    signals,
    removed,
    logs,
    errors,
    result,
    controller,
    get spawns() {
      return spawns;
    },
    change() {
      for (const watcher of watchers) watcher.change();
    },
    async stop() {
      signals.get("SIGTERM")?.();
      controller.abort();
      return result;
    },
  };
  cleanups.push(() => harness.stop());
  return harness;
}

async function eventually(predicate: () => boolean) {
  const deadline = Date.now() + 2000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Condition was not reached");
    await Bun.sleep(5);
  }
}

function processAt(harness: ReturnType<typeof createHarness>, index: number) {
  const process = harness.processes[index];
  if (!process) throw new Error(`Missing process ${index}`);
  return process;
}

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

describe("watch-wasm lifecycle", () => {
  test("builds initially and debounces bursts for 120ms after the last edit", async () => {
    const harness = createHarness();
    await eventually(() => harness.spawns === 1);
    expect(harness.watchers).toHaveLength(3);
    expect(harness.logs[0]).toBe("Watching Rust…");
    processAt(harness, 0).finish(0);
    harness.change();
    await Bun.sleep(80);
    harness.change();
    await Bun.sleep(80);
    expect(harness.spawns).toBe(1);
    await eventually(() => harness.spawns === 2);
    processAt(harness, 1).finish(0);
    await Bun.sleep(160);
    expect(harness.spawns).toBe(2);
    await harness.stop();
    expect(harness.processes.map((process) => process.kills)).toEqual([0, 0]);
  });

  test("serializes builds and coalesces multiple debounced edits into one pending rebuild", async () => {
    const harness = createHarness();
    await eventually(() => harness.spawns === 1);
    for (let index = 0; index < 3; index += 1) {
      harness.change();
      await Bun.sleep(150);
    }
    expect(harness.spawns).toBe(1);
    processAt(harness, 0).finish(0);
    await eventually(() => harness.spawns === 2);
    processAt(harness, 1).finish(0);
    await Bun.sleep(150);
    expect(harness.spawns).toBe(2);
  });

  test("recovers from a spawn exception on the next edit", async () => {
    const harness = createHarness({ failSpawn: 1 });
    await eventually(() => harness.errors.length === 1);
    expect(harness.errors[0]).toContain(
      "build spawn failed: Error: cannot spawn",
    );
    harness.change();
    await eventually(() => harness.processes.length === 1);
    expect(harness.spawns).toBe(2);
  });

  test("reports a nonzero exit and still runs the pending rebuild", async () => {
    const harness = createHarness();
    await eventually(() => harness.spawns === 1);
    harness.change();
    await Bun.sleep(150);
    processAt(harness, 0).finish(7);
    await eventually(() => harness.spawns === 2);
    expect(harness.errors).toEqual(["WASM build failed with exit code 7"]);
    expect(processAt(harness, 0).kills).toBe(0);
  });

  for (const failWatch of [0, 1, 2]) {
    test(`releases partial watcher acquisition when watcher ${failWatch} throws`, async () => {
      const harness = createHarness({ failWatch });
      expect(Exit.isFailure(await harness.result)).toBe(true);
      expect(harness.watchers.map((watcher) => watcher.closes)).toEqual(
        Array.from({ length: failWatch }, () => 1),
      );
      expect(harness.spawns).toBe(0);
      expect(harness.signals.size).toBe(0);
      expect(harness.removed.toSorted()).toEqual(["SIGINT", "SIGTERM"]);
      harness.change();
      await Bun.sleep(140);
      expect(harness.spawns).toBe(0);
    });
  }

  test("shutdown cancels debounce and ignores late callbacks and repeated signals", async () => {
    const harness = createHarness();
    await eventually(() => harness.spawns === 1);
    processAt(harness, 0).finish(0);
    harness.change();
    await Bun.sleep(30);
    const stop = harness.signals.get("SIGINT");
    if (!stop) throw new Error("Missing SIGINT handler");
    stop();
    stop();
    harness.change();
    expect(Exit.isSuccess(await harness.result)).toBe(true);
    stop();
    harness.change();
    await Bun.sleep(150);
    expect(harness.spawns).toBe(1);
    expect(harness.watchers.map((watcher) => watcher.closes)).toEqual([
      1, 1, 1,
    ]);
    expect(harness.removed.toSorted()).toEqual(["SIGINT", "SIGTERM"]);
    expect(harness.signals.size).toBe(0);
  });

  test("shutdown kills the active child exactly once and discards pending work", async () => {
    const harness = createHarness();
    await eventually(() => harness.spawns === 1);
    harness.change();
    await Bun.sleep(150);
    const stop = harness.signals.get("SIGTERM");
    if (!stop) throw new Error("Missing SIGTERM handler");
    stop();
    stop();
    expect(Exit.isSuccess(await harness.result)).toBe(true);
    harness.change();
    await Bun.sleep(150);
    expect(harness.spawns).toBe(1);
    expect(processAt(harness, 0).kills).toBe(1);
    expect(harness.errors).toEqual([]);
    expect(harness.watchers.map((watcher) => watcher.closes)).toEqual([
      1, 1, 1,
    ]);
  });

  test("shutdown waits for the killed child to exit before completing", async () => {
    const harness = createHarness();
    await eventually(() => harness.spawns === 1);
    const process = processAt(harness, 0);
    process.kill = () => {
      process.kills += 1;
    };
    let finished = false;
    void harness.result.then(() => {
      finished = true;
    });
    try {
      harness.signals.get("SIGTERM")?.();
      await eventually(() => process.kills === 1);
      await Bun.sleep(20);
      expect(finished).toBe(false);
      harness.change();
      expect(harness.spawns).toBe(1);
    } finally {
      process.finish(143);
    }
    expect(Exit.isSuccess(await harness.result)).toBe(true);
    expect(harness.signals.size).toBe(0);
  });

  test("external interruption releases the child, watchers and signals", async () => {
    const harness = createHarness();
    await eventually(() => harness.spawns === 1);
    harness.controller.abort();
    expect(Exit.isFailure(await harness.result)).toBe(true);
    expect(processAt(harness, 0).kills).toBe(1);
    expect(harness.watchers.map((watcher) => watcher.closes)).toEqual([
      1, 1, 1,
    ]);
    expect(harness.signals.size).toBe(0);
    expect(harness.errors).toEqual([]);
  });

  test("a rejected process wait is reported and releases its process before retrying", async () => {
    const harness = createHarness();
    await eventually(() => harness.spawns === 1);
    processAt(harness, 0).fail(new Error("lost process"));
    await eventually(() =>
      harness.errors.some((error) => error.includes("build wait failed")),
    );
    expect(processAt(harness, 0).kills).toBe(1);
    harness.change();
    await eventually(() => harness.spawns === 2);
  });

  test("releases the first signal handler if registering the second fails", async () => {
    const harness = createHarness({ failSignal: "SIGTERM" });
    expect(Exit.isFailure(await harness.result)).toBe(true);
    expect(harness.removed).toEqual(["SIGINT"]);
    expect(harness.signals.size).toBe(0);
    expect(harness.watchers).toHaveLength(0);
  });

  test("one cleanup exception does not skip other resources", async () => {
    const harness = createHarness({ failClose: 2 });
    await eventually(() => harness.spawns === 1);
    await harness.stop();
    expect(harness.watchers.map((watcher) => watcher.closes)).toEqual([
      1, 1, 1,
    ]);
    expect(harness.errors).toEqual([
      "WASM watch cleanup failed: Error: cannot close",
    ]);
    expect(harness.signals.size).toBe(0);
  });
});
