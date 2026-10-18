import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const hook = fileURLToPath(new URL("./check-changed.mjs", import.meta.url));
const config = fileURLToPath(new URL("../bunfig.toml", import.meta.url));

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), "personal-site-hook-test-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  };
  git("init", "-q");
  copyFileSync(config, join(cwd, "bunfig.toml"));
  writeFileSync(join(cwd, ".gitignore"), "generated/\n");
  git("add", ".");
  const run = (event = {}) => {
    const result = spawnSync(process.execPath, [hook], {
      cwd,
      input: JSON.stringify({ cwd, stop_hook_active: false, ...event }),
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  return { cwd, git, run };
}

test("clean tree, ignored files, deleted files, symlinks and unknown formats pass", (t) => {
  const { cwd, git, run } = fixture(t);
  assert.deepEqual(run(), {});
  writeFileSync(join(cwd, "deleted.ts"), "broken (");
  git("add", "deleted.ts");
  rmSync(join(cwd, "deleted.ts"));
  mkdirSync(join(cwd, "generated"));
  writeFileSync(join(cwd, "generated/ignored.ts"), "broken (");
  mkdirSync(join(cwd, ".agents"));
  writeFileSync(join(cwd, ".agents/ignored.ts"), "broken (");
  symlinkSync(join(cwd, "generated/ignored.ts"), join(cwd, "link.ts"));
  writeFileSync(join(cwd, "shader.wgsl"), "unknown language");
  assert.deepEqual(run(), {});
});

test("untracked paths with spaces report format failures without writing", (t) => {
  const { cwd, run } = fixture(t);
  const path = join(cwd, "file with spaces.ts");
  const source = "export const value={x:1}\n";
  writeFileSync(path, source);
  const result = run();
  assert.equal(result.decision, "block");
  assert.match(result.reason, /fmt:/);
  assert.equal(readFileSync(path, "utf8"), source);
});

test("staged lint failures are reported, then the continuation guard passes", (t) => {
  const { cwd, git, run } = fixture(t);
  writeFileSync(join(cwd, "bad.ts"), "export const value: any = 1;\n");
  git("add", "bad.ts");
  const result = run();
  assert.equal(result.decision, "block");
  assert.match(result.reason, /lint:/);
  assert.match(result.reason, /no-explicit-any/);
  assert.deepEqual(run({ stop_hook_active: true }), {});
});

test("malformed events fail with valid blocking JSON", () => {
  const result = spawnSync(process.execPath, [hook], {
    input: "{",
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).decision, "block");
});

test("missing tooling fails closed without recursively invoking the lint script", (t) => {
  const { cwd } = fixture(t);
  mkdirSync(join(cwd, "scripts"));
  for (const file of ["bun-tool.mjs", "bun-tools-version.mjs"]) {
    copyFileSync(
      fileURLToPath(new URL(file, import.meta.url)),
      join(cwd, "scripts", file),
    );
  }
  writeFileSync(
    join(cwd, "package.json"),
    JSON.stringify({ scripts: { lint: "node scripts/bun-tool.mjs lint ." } }),
  );
  const result = spawnSync(
    process.execPath,
    ["scripts/bun-tool.mjs", "lint", "."],
    {
      cwd,
      encoding: "utf8",
      timeout: 5000,
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Run bun run setup:tools/);
});
