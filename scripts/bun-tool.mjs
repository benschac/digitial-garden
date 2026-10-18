import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { revision } from "./bun-tools-version.mjs";

const bun = fileURLToPath(new URL("../.tools/bun/bun", import.meta.url));

export function runBunTool(tool, args, options = {}) {
  if (tool !== "lint" && tool !== "fmt")
    throw new Error(`Unknown Bun tool: ${tool}`);
  const installed = spawnSync(bun, ["--revision"], {
    encoding: "utf8",
    timeout: 5000,
  });
  if (installed.status !== 0 || installed.stdout.trim() !== revision) {
    return {
      status: 1,
      stderr: `Native Bun ${revision} is unavailable. Run bun run setup:tools. No files were checked or changed.\n`,
    };
  }
  // Bypass package scripts explicitly so a `lint` script cannot invoke itself.
  return spawnSync(bun, [tool, "--no-script", ...args], options);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [command, ...args] = process.argv.slice(2);
  const commands =
    command === "check" || command === "check:write"
      ? [
          ["lint", ...(command === "check:write" ? ["--fix"] : [])],
          ["fmt", ...(command === "check" ? ["--check"] : [])],
        ]
      : [[command]];
  for (const [tool, ...flags] of commands) {
    const result = runBunTool(tool, [...flags, ...args], { stdio: "inherit" });
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) process.stderr.write(`${result.error.message}\n`);
    if (result.status !== 0) process.exitCode = result.status ?? 1;
  }
}
