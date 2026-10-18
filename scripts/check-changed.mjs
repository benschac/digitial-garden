import { spawnSync } from "node:child_process";
import { lstatSync } from "node:fs";
import { join } from "node:path";

import { runBunTool } from "./bun-tool.mjs";

const respond = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);

try {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const event = JSON.parse(input);

  // Stop may continue the turn once. Do not loop on pre-existing failures.
  if (event.stop_hook_active) {
    respond({});
  } else {
    let cwd = event.cwd ?? process.cwd();
    const git = (args) => {
      const result = spawnSync("git", args, {
        cwd,
        encoding: "utf8",
        timeout: 5000,
      });
      if (result.error || result.status !== 0) {
        throw new Error(result.error?.message ?? result.stderr);
      }
      return result.stdout;
    };
    const root = git(["rev-parse", "--show-toplevel"]).trim();
    cwd = root;
    const files = [
      ...new Set(
        [
          git(["diff", "--name-only", "--diff-filter=ACMRT", "-z"]),
          git(["diff", "--cached", "--name-only", "--diff-filter=ACMRT", "-z"]),
          git(["ls-files", "--others", "--exclude-standard", "-z"]),
        ]
          .join("\0")
          .split("\0")
          .filter(Boolean),
      ),
    ].filter((file) => {
      try {
        return lstatSync(join(root, file)).isFile();
      } catch {
        return false;
      }
    });
    const failures = [];
    const deadline = Date.now() + 50_000;
    const check = (tool, args) => {
      const remaining = deadline - Date.now();
      if (remaining <= 0)
        throw new Error("Changed-file checks exceeded 50 seconds.");
      const result = runBunTool(tool, args, {
        cwd: root,
        encoding: "utf8",
        timeout: Math.min(20_000, remaining),
        maxBuffer: 1024 * 1024,
      });
      if (result.error || result.status !== 0) {
        failures.push(
          `${tool}:\n${result.error?.message ?? ""}${result.stdout ?? ""}${result.stderr ?? ""}`.slice(
            0,
            6000,
          ),
        );
      }
    };
    // Never invoke either command with an empty file list: that scans the repo.
    // NUL-delimited Git output and argument arrays preserve spaces in paths.
    for (let index = 0; index < files.length; index += 100) {
      const batch = files.slice(index, index + 100);
      check("fmt", ["--check", "--ignore-unknown", "--", ...batch]);
      const scripts = batch.filter((file) => /\.[cm]?[jt]sx?$/.test(file));
      if (scripts.length) {
        check("lint", [
          "--no-warn-ignored",
          "--no-error-on-unmatched-pattern",
          "--",
          ...scripts,
        ]);
      }
    }
    respond(
      failures.length
        ? {
            decision: "block",
            reason: `Native Bun format/lint checks failed on uncommitted files. Fix issues introduced by this task and rerun checks. Preserve unrelated changes and report pre-existing failures. This hook did not modify files.\n\n${failures.join("\n\n").slice(0, 12_000)}`,
          }
        : {},
    );
  }
} catch (error) {
  respond({
    decision: "block",
    reason: `Could not run Bun format/lint checks: ${error.message}`,
  });
}
