import { watch } from "node:fs";
import path from "node:path";

import { Effect } from "effect";

import { watchWasm } from "./watch-wasm-lifecycle";

const webDirectory = path.resolve(import.meta.dir, "..");

const rustDirectory = path.resolve(
  webDirectory,
  "../../packages/wasm-canvas-engine"
);

await Effect.runPromise(
  watchWasm({
    error: (message) => console.error(message),
    log: (message) => console.log(message),
    offSignal: (signal, listener) => {
      process.off(signal, listener);
    },
    onSignal: (signal, listener) => {
      process.on(signal, listener);
    },
    spawn: () =>
      Bun.spawn(["bun", "run", "wasm:build"], {
        cwd: webDirectory,
        stderr: "inherit",
        stdin: "inherit",
        stdout: "inherit",
      }),
    targets: [
      { path: path.resolve(rustDirectory, "src"), recursive: true },
      { path: path.resolve(rustDirectory, "Cargo.toml"), recursive: false },
      { path: path.resolve(rustDirectory, "Cargo.lock"), recursive: false },
    ],
    watch: (target, onChange) =>
      watch(target.path, { recursive: target.recursive }, onChange),
    watchingMessage: `Watching ${rustDirectory} for Rust changes…`,
  })
);
