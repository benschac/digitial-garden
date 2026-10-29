import { watch } from "node:fs";
import { resolve } from "node:path";

import { Effect } from "effect";

import { watchWasm } from "./watch-wasm-lifecycle";

const webDirectory = resolve(import.meta.dir, "..");
const rustDirectory = resolve(
  webDirectory,
  "../../packages/wasm-canvas-engine",
);

await Effect.runPromise(
  watchWasm({
    targets: [
      { path: resolve(rustDirectory, "src"), recursive: true },
      { path: resolve(rustDirectory, "Cargo.toml"), recursive: false },
      { path: resolve(rustDirectory, "Cargo.lock"), recursive: false },
    ],
    watch: (target, onChange) =>
      watch(target.path, { recursive: target.recursive }, onChange),
    spawn: () =>
      Bun.spawn(["bun", "run", "wasm:build"], {
        cwd: webDirectory,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      }),
    onSignal: (signal, listener) => {
      process.on(signal, listener);
    },
    offSignal: (signal, listener) => {
      process.off(signal, listener);
    },
    log: (message) => console.log(message),
    error: (message) => console.error(message),
    watchingMessage: `Watching ${rustDirectory} for Rust changes…`,
  }),
);
