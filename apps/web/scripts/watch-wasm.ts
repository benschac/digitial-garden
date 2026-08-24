import { type FSWatcher, watch } from "node:fs";
import { resolve } from "node:path";

const webDirectory = resolve(import.meta.dir, "..");
const rustDirectory = resolve(
  webDirectory,
  "../../packages/wasm-canvas-engine",
);
const watchers: FSWatcher[] = [];
let buildProcess: ReturnType<typeof Bun.spawn> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let buildQueued = false;
let stopping = false;

async function buildWasm() {
  if (buildProcess) {
    buildQueued = true;
    return;
  }

  console.log("\nRust changed — rebuilding particle-engine.wasm");
  buildProcess = Bun.spawn(["bun", "run", "wasm:build"], {
    cwd: webDirectory,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await buildProcess.exited;
  buildProcess = null;

  if (exitCode !== 0) {
    console.error(`WASM build failed with exit code ${exitCode}`);
  }

  if (buildQueued && !stopping) {
    buildQueued = false;
    await buildWasm();
  }
}

function scheduleBuild() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void buildWasm();
  }, 120);
}

function stop() {
  stopping = true;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  for (const watcher of watchers) {
    watcher.close();
  }
  buildProcess?.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

watchers.push(
  watch(resolve(rustDirectory, "src"), { recursive: true }, scheduleBuild),
  watch(resolve(rustDirectory, "Cargo.toml"), scheduleBuild),
  watch(resolve(rustDirectory, "Cargo.lock"), scheduleBuild),
);

console.log(`Watching ${rustDirectory} for Rust changes…`);
await buildWasm();
