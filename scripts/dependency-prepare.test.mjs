import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateRequest } from "./dependency-prepare.mjs";

const script = fileURLToPath(
  new URL("dependency-prepare.mjs", import.meta.url)
);

const origin = "git@github.com:benschac/digitial-garden.git";

const writeJson = (file, value) =>
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));

const fixture = (t, mode = "success") => {
  const root = mkdtempSync(path.join(os.tmpdir(), "dependency-prepare-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const repo = path.join(root, "repo");
  const city = path.join(root, "city");
  const bin = path.join(root, "bin");

  for (const dir of [repo, city, bin]) {
    mkdirSync(dir);
  }

  const config = path.join(root, "gitconfig");
  writeFileSync(
    config,
    `[user]\n\tname = Dependency test\n\temail = dependency@example.test\n`
  );

  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: config,
    GIT_CONFIG_NOSYSTEM: "1",
    PATH: `${bin}:${process.env.PATH}`,
    TEST_BUN_MODE: mode,
  };

  const git = (...args) => {
    const result = spawnSync("git", args, {
      cwd: repo,
      encoding: "utf-8",
      env,
    });

    assert.equal(result.status, 0, result.stderr);

    return result.stdout.trim();
  };

  git("init", "-b", "main");
  mkdirSync(path.join(repo, "scripts"));
  writeJson(path.join(repo, "scripts/agent-sources.json"), []);
  writeJson(path.join(repo, "package.json"), {
    dependencies: { alpha: "^1.2.0", beta: "latest" },
    name: "fixture",
    packageManager: "bun@1.4.3",
    workspaces: ["apps/*"],
  });
  mkdirSync(path.join(repo, "apps/web"), { recursive: true });
  writeJson(path.join(repo, "apps/web/package.json"), {
    dependencies: { beta: "latest" },
    name: "@fixture/web",
  });
  writeJson(path.join(repo, "bun.lock"), {
    lockfileVersion: 2,
    packages: {
      alpha: ["alpha@1.2.0"],
      "alpha/beta": ["beta@1.0.0"],
      beta: ["beta@2.0.0"],
    },
    workspaces: {
      "": {
        dependencies: { alpha: "^1.2.0", beta: "latest" },
        name: "fixture",
      },
      "apps/web": { dependencies: { beta: "latest" }, name: "@fixture/web" },
    },
  });
  git("add", ".");
  git("commit", "-m", "baseline");
  const bun = path.join(bin, "bun");
  writeFileSync(
    bun,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const mode = process.env.TEST_BUN_MODE;
if (args[0] === "--version") { console.log(mode === "wrong-bun" ? "1.4.4" : "1.4.3"); }
else if (args[0] === "-e") { console.log(fs.readFileSync(args[2], "utf-8")); }
else if (args[0] === "install" && !args.includes("--frozen-lockfile")) {
 const lock = JSON.parse(fs.readFileSync("bun.lock", "utf-8"));
 const manifest = JSON.parse(fs.readFileSync("package.json", "utf-8"));
 lock.workspaces[""].dependencies.alpha = manifest.dependencies.alpha;
 lock.packages.alpha = ["alpha@1.2.1"];
 if (mode === "lock-churn") lock.packages.beta = ["beta@2.1.0"];
 if (mode === "transitive") lock.packages["alpha/beta"] = ["beta@1.1.0"];
 if (mode === "shadow") lock.packages["@fixture/web/beta"] = ["beta@2.1.0"];
 fs.writeFileSync("bun.lock", JSON.stringify(lock, null, 2) + "\\n");
} else if (args.join(" ") === "run verify") {
 if (process.env.TURBO_SCM_BASE !== "HEAD" || process.env.TURBO_SCM_HEAD !== "HEAD") process.exit(4);
 if (mode === "check-fails") process.exit(7);
 if (mode === "check-contaminates") fs.writeFileSync("unrelated.txt", "unexpected");
 if (mode === "manifest-contaminates") {
  const manifest = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  manifest.scripts = { build: "evil" };
  fs.writeFileSync("package.json", JSON.stringify(manifest));
 }
} else if (args.join(" ") !== "install --frozen-lockfile --ignore-scripts") { process.exit(8); }
`
  );
  chmodSync(bun, 0o755);

  const gitBinary = spawnSync("which", ["git"], {
    encoding: "utf-8",
  }).stdout.trim();

  const gitWrapper = path.join(bin, "git");
  writeFileSync(
    gitWrapper,
    `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const args = process.argv.slice(2);
const realGit = ${JSON.stringify(gitBinary)};
if (args[0] === "clone") {
 const destination = args.at(-1);
 const result = spawnSync(realGit, args.map(value => value === ${JSON.stringify(origin)} ? ${JSON.stringify(repo)} : value), { stdio: "inherit" });
 if (result.status !== 0) process.exit(result.status ?? 1);
 const set = spawnSync(realGit, ["remote", "set-url", "origin", ${JSON.stringify(origin)}], { cwd: destination, stdio: "inherit" });
 process.exit(set.status ?? 1);
}
const result = spawnSync(realGit, args, { stdio: "inherit" });
process.exit(result.status ?? 1);
`
  );
  chmodSync(gitWrapper, 0o755);

  const request = {
    bead: "ps-abc",
    city,
    declarations: [
      { from: "^1.2.0", path: "package.json", section: "dependencies" },
    ],
    package: "alpha",
    target: "1.2.1",
  };

  const requestFile = path.join(root, "request.json");
  writeJson(requestFile, request);

  return {
    city,
    env,
    request,
    requestFile,
    resultFile: path.join(
      city,
      ".gc/dependency-updates/ps-abc/prepare-script/result.json"
    ),
    run: () =>
      spawnSync(process.execPath, [script, requestFile], {
        encoding: "utf-8",
        env,
      }),
  };
};

test("prepares one scoped commit and replays without another installation or commit", (t) => {
  const f = fixture(t);
  const first = f.run();
  assert.equal(first.status, 0, first.stderr);
  const prepared = JSON.parse(first.stdout);
  assert.equal(prepared.status, "prepared");
  assert.equal(prepared.subject, "chore(deps): bump alpha from 1.2.0 to 1.2.1");
  assert.match(prepared.commit, /^[a-f0-9]{40}$/u);
  assert.equal(
    prepared.commands.filter(
      (entry) => entry.command === "bun" && entry.args[0] === "run"
    ).length,
    1
  );
  assert.ok(prepared.reviewRequired.includes("transitive-lock-diff"));
  const second = f.run();
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(JSON.parse(second.stdout), prepared);
  assert.equal(
    readJson(path.join(prepared.clone, "package.json")).dependencies.alpha,
    "^1.2.1"
  );
});

for (const [mode, error] of [
  ["wrong-bun", "Installed Bun"],
  ["lock-churn", "Unrelated direct resolution"],
  ["shadow", "Unrelated direct resolution"],
  ["check-fails", "run verify failed"],
  ["check-contaminates", "Unexpected untracked"],
  ["manifest-contaminates", "Unexpected manifest"],
]) {
  test(`preserves failed ${mode} attempt without a commit or automatic retry`, (t) => {
    const f = fixture(t, mode);
    const first = f.run();
    assert.equal(first.status, 1);
    assert.match(first.stderr, new RegExp(error, "u"));
    const result = readJson(f.resultFile);
    assert.equal(result.status, "failed");
    assert.equal(result.commit, undefined);
    assert.equal(f.run().status, 1);
    assert.deepEqual(readJson(f.resultFile), result);
  });
}

test("rejects breaking, prerelease, traversal, and stale declarations", (t) => {
  const f = fixture(t);

  for (const target of ["2.0.0", "1.2.1-beta", "1.1.0", "1.2.0"]) {
    assert.throws(() => validateRequest({ ...f.request, target }));
  }

  assert.throws(() =>
    validateRequest({
      ...f.request,
      declarations: [{ ...f.request.declarations[0], path: "../package.json" }],
    })
  );
  writeJson(f.requestFile, {
    ...f.request,
    declarations: [{ ...f.request.declarations[0], from: "1.1.0" }],
  });
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Stale or missing declaration/u);
});

test("prepared replay refuses altered artifact", (t) => {
  const f = fixture(t);
  assert.equal(f.run().status, 0);
  const prepared = readJson(f.resultFile);
  writeFileSync(path.join(prepared.clone, "extra.txt"), "do not discard");
  const replay = f.run();
  assert.equal(replay.status, 1);
  assert.match(replay.stderr, /Prepared clone is dirty/u);
});

test("refuses symlink escape and interrupted attempts", (t) => {
  const f = fixture(t);
  symlinkSync(path.dirname(f.city), path.join(f.city, ".gc"));
  assert.match(f.run().stderr, /Unsafe directory/u);
  rmSync(path.join(f.city, ".gc"));
  const attempt = path.dirname(f.resultFile);
  mkdirSync(attempt, { recursive: true });
  writeJson(f.resultFile, { status: "running" });
  assert.match(f.run().stderr, /incomplete or failed/u);
});

test("allows a nested transitive change while unrelated workspace resolutions remain unchanged", (t) => {
  const f = fixture(t, "transitive");
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const prepared = JSON.parse(result.stdout);
  const lock = readJson(path.join(prepared.clone, "bun.lock"));
  assert.deepEqual(lock.packages["alpha/beta"], ["beta@1.1.0"]);
  assert.deepEqual(lock.packages.beta, ["beta@2.0.0"]);
});
