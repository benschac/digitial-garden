import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const names = new Map([
  ["lint", "oxlint"],
  ["fmt", "oxfmt"],
]);

export const runOxcTool = (tool, args, options = {}) => {
  const name = names.get(tool);

  if (!name) {
    throw new Error(`Unknown Oxc tool: ${tool}`);
  }

  const binary = fileURLToPath(
    new URL(`../node_modules/${name}/bin/${name}`, import.meta.url)
  );

  if (!existsSync(binary)) {
    return {
      status: 1,
      stderr: `${name} is unavailable. Run bun install. No files were checked or changed.\n`,
    };
  }

  return spawnSync(process.execPath, [binary, ...args], options);
};

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
    const result = runOxcTool(tool, [...flags, ...args], { stdio: "inherit" });

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    if (result.error) {
      process.stderr.write(`${result.error.message}\n`);
    }

    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
    }
  }
}
