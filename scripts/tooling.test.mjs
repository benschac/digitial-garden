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
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const hook = fileURLToPath(new URL("check-changed.mjs", import.meta.url));

const fixture = (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), "personal-site-hook-test-"));
  t.after(() => rmSync(cwd, { force: true, recursive: true }));

  const git = (...args) => {
    const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
    assert.equal(result.status, 0, result.stderr);
  };

  git("init", "-q");
  writeFileSync(
    path.join(cwd, ".oxlintrc.json"),
    '{\n  "plugins": ["typescript"],\n  "ignorePatterns": [".agents/**"],\n  "rules": { "typescript/no-explicit-any": "error" }\n}\n'
  );
  writeFileSync(
    path.join(cwd, ".oxfmtrc.json"),
    '{\n  "ignorePatterns": [".agents/**"]\n}\n'
  );
  writeFileSync(path.join(cwd, ".gitignore"), "generated/\n");
  git("add", ".");

  const run = (event = {}) => {
    const result = spawnSync(process.execPath, [hook], {
      cwd,
      encoding: "utf-8",
      input: JSON.stringify({ cwd, stop_hook_active: false, ...event }),
      timeout: 10_000,
    });

    assert.equal(result.status, 0, result.stderr);

    return JSON.parse(result.stdout);
  };

  return { cwd, git, run };
};

test("clean tree, ignored files, deleted files, symlinks and unknown formats pass", (t) => {
  const { cwd, git, run } = fixture(t);
  assert.deepEqual(run(), {});
  writeFileSync(path.join(cwd, "deleted.ts"), "broken (");
  git("add", "deleted.ts");
  rmSync(path.join(cwd, "deleted.ts"));
  mkdirSync(path.join(cwd, "generated"));
  writeFileSync(path.join(cwd, "generated/ignored.ts"), "broken (");
  mkdirSync(path.join(cwd, ".agents"));
  writeFileSync(path.join(cwd, ".agents/ignored.ts"), "broken (");
  symlinkSync(
    path.join(cwd, "generated/ignored.ts"),
    path.join(cwd, "link.ts")
  );
  writeFileSync(path.join(cwd, "shader.wgsl"), "unknown language");
  assert.deepEqual(run(), {});
});

test("untracked paths with spaces report format failures without writing", (t) => {
  const { cwd, run } = fixture(t);
  const file = path.join(cwd, "file with spaces.ts");
  const source = "export const value={x:1}\n";
  writeFileSync(file, source);
  const result = run();
  assert.equal(result.decision, "block");
  assert.match(result.reason, /fmt:/u);
  assert.equal(readFileSync(file, "utf-8"), source);
});

test("staged lint failures are reported, then the continuation guard passes", (t) => {
  const { cwd, git, run } = fixture(t);
  writeFileSync(path.join(cwd, "bad.ts"), "export const value: any = 1;\n");
  git("add", "bad.ts");
  const result = run();
  assert.equal(result.decision, "block");
  assert.match(result.reason, /lint:/u);
  assert.match(result.reason, /no-explicit-any/u);
  assert.deepEqual(run({ stop_hook_active: true }), {});
});

test("malformed events fail with valid blocking JSON", () => {
  const result = spawnSync(process.execPath, [hook], {
    encoding: "utf-8",
    input: "{",
  });

  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).decision, "block");
});

test("missing tooling fails closed without recursively invoking the lint script", (t) => {
  const { cwd } = fixture(t);
  mkdirSync(path.join(cwd, "scripts"));
  copyFileSync(
    fileURLToPath(new URL("oxc-tool.mjs", import.meta.url)),
    path.join(cwd, "scripts/oxc-tool.mjs")
  );
  writeFileSync(
    path.join(cwd, "package.json"),
    JSON.stringify({ scripts: { lint: "node scripts/oxc-tool.mjs lint ." } })
  );

  const result = spawnSync(
    process.execPath,
    ["scripts/oxc-tool.mjs", "lint", "."],
    {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /bun install/u);
});
