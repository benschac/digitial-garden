import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
  readFileSync,
  existsSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  validateLandingBase,
  validateRemoteEntry,
  hashDirectory,
  validateRequest,
  validateCommit,
  checkStage,
  beginCheckArchive,
  finishCheckArchive,
} from "./skill-update.mjs";

const nativeFixture = (t, stage = "reviewed") => {
  const city = mkdtempSync(path.join(os.tmpdir(), "skill-native-"));
  t.after(() => rmSync(city, { force: true, recursive: true }));
  const candidate = "ps-candidate";
  const directory = path.join(city, ".gc", "skill-updates", candidate);

  const artifacts = path.join(
    city,
    ".gc",
    "molecules",
    "ps-root",
    "artifacts",
    "ps-subject"
  );

  mkdirSync(directory, { recursive: true });
  mkdirSync(artifacts, { recursive: true });

  const request = {
    candidate,
    currentHash: "c".repeat(64),
    scanBase: "a".repeat(40),
    skill: "demo",
    skillPath: "skills/demo/SKILL.md",
    source: "owner/repo",
    targetHash: "d".repeat(64),
    targetRevision: "b".repeat(40),
  };

  writeFileSync(path.join(directory, "request.json"), JSON.stringify(request));
  writeFileSync(
    path.join(directory, "prepared.json"),
    "retained receipt bytes\n"
  );
  writeFileSync(
    path.join(artifacts, "result.json"),
    JSON.stringify({ candidate, stage })
  );

  const rows = {
    [candidate]: { id: candidate, metadata: {} },
    "ps-convoy": {
      id: "ps-convoy",
      metadata: {
        "gc.drain_member_id": candidate,
        "gc.synthetic_kind": "drain-unit-convoy",
      },
    },
    "ps-root": {
      id: "ps-root",
      metadata: {
        "gc.drain_member_id": candidate,
        "gc.formula_name": "update-skill",
        "gc.input_convoy_id": "ps-convoy",
        "gc.kind": "workflow",
      },
      status: "in_progress",
    },
    "ps-subject": {
      assignee: "psc-worker",
      id: "ps-subject",
      metadata: {
        "gc.iteration": "1",
        "gc.ralph_step_id": {
          integrated: "publish",
          prepared: "prepare",
          published: "publish",
          reviewed: "review",
        }[stage],
        "gc.root_bead_id": "ps-root",
        "gc.session_id": "psc-worker",
      },
      status: "closed",
    },
  };

  const env = {
    ...process.env,
    GC_ARTIFACT_DIR: artifacts,
    GC_BEAD_ID: "ps-subject",
    GC_CITY: city,
    GC_ITERATION: "1",
    GC_MOLECULE_DIR: path.join(city, ".gc", "molecules", "ps-root"),
    GC_ROOT_BEAD_ID: "ps-root",
  };

  return { artifacts, city, directory, env, read: (id) => rows[id], rows };
};

const nativeShell = (f, body) => {
  const repo = fileURLToPath(new URL("..", import.meta.url));
  const bin = path.join(f.city, "bin");
  mkdirSync(bin);
  const rowsFile = path.join(f.city, "beads.json");
  writeFileSync(rowsFile, JSON.stringify(f.rows));
  writeFileSync(
    path.join(bin, "gc"),
    '#!/usr/bin/env node\nconst fs = require("node:fs"); console.log(JSON.stringify([JSON.parse(fs.readFileSync(process.env.SKILL_TEST_BEADS))[process.argv.at(-2)]]));\n',
    { mode: 0o700 }
  );

  return {
    args: [
      "-c",
      `set -eu\nrepo=$1\n. "$repo/gascity/skill-updates/assets/checks/archive.sh"\nskill_archive_begin reviewed\n${body}`,
      "sh",
      repo,
    ],
    options: {
      encoding: "utf-8",
      env: {
        ...f.env,
        PATH: `${bin}:${process.env.PATH}`,
        SKILL_TEST_BEADS: rowsFile,
      },
    },
  };
};

test("all check stages retain exact output and receipts after terminal molecule purge", (t) => {
  for (const stage of ["prepared", "reviewed", "integrated", "published"]) {
    for (const exitCode of [0, 23]) {
      const f = nativeFixture(t, stage);
      const archive = beginCheckArchive(stage, f.env, f.read);
      const output = `raw ${stage} ${exitCode}\n${"x".repeat(5000)}`;
      writeFileSync(path.join(archive, "stdout.log"), output);
      writeFileSync(path.join(archive, "stderr.log"), "raw stderr\n");
      writeFileSync(
        path.join(archive, "qualification.log"),
        "partial or successful qualification\n"
      );
      writeFileSync(
        path.join(archive, "exit.json"),
        JSON.stringify({ exitCode })
      );
      const manifest = finishCheckArchive(stage, exitCode, f.env, f.read);
      rmSync(f.env.GC_MOLECULE_DIR, { recursive: true });
      assert.equal(manifest.exitCode, exitCode);
      assert.equal(manifest.complete, true);
      assert.equal(manifest.subject, "ps-subject");
      assert.equal(
        readFileSync(path.join(archive, "stdout.log"), "utf-8"),
        output
      );
      assert.equal(
        readFileSync(
          path.join(archive, "after/receipts/prepared.json"),
          "utf-8"
        ),
        "retained receipt bytes\n"
      );
      assert.equal(
        readFileSync(path.join(f.directory, "prepared.json"), "utf-8"),
        "retained receipt bytes\n"
      );
      assert.ok(manifest.hashes["sealed/qualification.log"]);
      assert.ok(manifest.policy["scripts/skill-update.mjs"]);
    }
  }
});

test("archive establishment rejects foreign native identity, paths and ownership", (t) => {
  const f = nativeFixture(t);
  assert.throws(
    () =>
      beginCheckArchive(
        "reviewed",
        { ...f.env, GC_ARTIFACT_DIR: f.directory },
        f.read
      ),
    /artifact path/u
  );
  assert.throws(
    () =>
      beginCheckArchive(
        "reviewed",
        { ...f.env, GC_BEAD_ID: "../foreign" },
        f.read
      ),
    /identity/u
  );
  assert.throws(
    () =>
      beginCheckArchive("reviewed", { ...f.env, GC_ITERATION: "2" }, f.read),
    /iteration/u
  );
  assert.throws(
    () =>
      beginCheckArchive(
        "reviewed",
        { ...f.env, GC_ROOT_BEAD_ID: "ps-other" },
        f.read
      ),
    /root environment/u
  );
  f.rows["ps-subject"].metadata["gc.session_id"] = "psc-other";
  assert.throws(
    () => beginCheckArchive("reviewed", f.env, f.read),
    /ownership/u
  );
  f.rows["ps-subject"].metadata["gc.session_id"] = "psc-worker";
  f.rows["ps-root"].metadata["gc.drain_member_id"] = "ps-other";
  assert.throws(
    () => beginCheckArchive("reviewed", f.env, f.read),
    /Conflicting drain/u
  );
});

test("fresh integration commits retain separate checks without unchanged qualification replay", (t) => {
  const f = nativeFixture(t, "integrated");

  const finish = (commit) => {
    writeFileSync(
      path.join(f.directory, "integrated.json"),
      JSON.stringify({ candidate: "ps-candidate", commit })
    );
    const archive = beginCheckArchive("integrated", f.env, f.read);
    writeFileSync(path.join(archive, "stdout.log"), commit);
    writeFileSync(path.join(archive, "stderr.log"), "");
    writeFileSync(path.join(archive, "exit.json"), '{"exitCode":0}');
    finishCheckArchive("integrated", 0, f.env, f.read);

    return archive;
  };

  const first = finish("a".repeat(40));
  const firstBytes = readFileSync(path.join(first, "manifest.json"), "utf-8");
  assert.throws(
    () => beginCheckArchive("integrated", f.env, f.read),
    /EEXIST/u
  );
  const second = finish("b".repeat(40));
  assert.notEqual(first, second);
  assert.equal(
    readFileSync(path.join(first, "manifest.json"), "utf-8"),
    firstBytes
  );
  assert.equal(
    JSON.parse(
      readFileSync(path.join(first, "after/receipts/integrated.json"), "utf-8")
    ).commit,
    "a".repeat(40)
  );
  assert.equal(
    JSON.parse(
      readFileSync(path.join(second, "after/receipts/integrated.json"), "utf-8")
    ).commit,
    "b".repeat(40)
  );
});

test("archive storage rejects symlinks and preserves unknown or colliding evidence", (t) => {
  const f = nativeFixture(t);
  symlinkSync(f.artifacts, path.join(f.directory, "attempts"));
  assert.throws(() => beginCheckArchive("reviewed", f.env, f.read), /symlink/u);
  rmSync(path.join(f.directory, "attempts"));
  const archive = beginCheckArchive("reviewed", f.env, f.read);
  writeFileSync(path.join(archive, "unknown"), "untouched");
  assert.throws(() => beginCheckArchive("reviewed", f.env, f.read), /EEXIST/u);
  assert.equal(
    readFileSync(path.join(archive, "unknown"), "utf-8"),
    "untouched"
  );
  rmSync(path.join(archive, "unknown"));
  symlinkSync(
    path.join(f.directory, "prepared.json"),
    path.join(archive, "stdout.log")
  );
  writeFileSync(path.join(archive, "stderr.log"), "errors");
  writeFileSync(path.join(archive, "exit.json"), '{"exitCode":0}');
  assert.throws(
    () => finishCheckArchive("reviewed", 0, f.env, f.read),
    /Unsafe evidence/u
  );
  assert.equal(existsSync(path.join(archive, "manifest.json")), false);
});

test("missing or malformed native pointers remain archivable check failures", (t) => {
  const f = nativeFixture(t);
  writeFileSync(path.join(f.artifacts, "result.json"), "malformed pointer\n");
  const archive = beginCheckArchive("reviewed", f.env, f.read);
  writeFileSync(path.join(archive, "stdout.log"), "");
  writeFileSync(path.join(archive, "stderr.log"), "preflight failed\n");
  writeFileSync(path.join(archive, "exit.json"), '{"exitCode":1}');
  const manifest = finishCheckArchive("reviewed", 1, f.env, f.read);
  assert.equal(manifest.exitCode, 1);
  assert.equal(
    readFileSync(path.join(archive, "after/native/result.json"), "utf-8"),
    "malformed pointer\n"
  );
});

test("native checker preflight failures retain their raw errors", (t) => {
  for (const failure of [
    "missing-pointer",
    "missing-request",
    "malformed-request",
  ]) {
    const f = nativeFixture(t);

    if (failure === "missing-pointer") {
      rmSync(path.join(f.artifacts, "result.json"));
    } else if (failure === "missing-request") {
      rmSync(path.join(f.directory, "request.json"));
    } else {
      writeFileSync(path.join(f.directory, "request.json"), "invalid JSON\n");
    }

    const invocation = nativeShell(
      f,
      'node "$repo/scripts/skill-update.mjs" check reviewed'
    );

    const result = spawnSync("/bin/sh", invocation.args, invocation.options);
    assert.equal(result.status, 1);
    assert.notEqual(result.stderr, "");

    const archive = path.join(
      f.directory,
      "attempts",
      "ps-root",
      "ps-subject",
      "checks",
      "reviewed"
    );

    const manifest = JSON.parse(
      readFileSync(path.join(archive, "manifest.json"), "utf-8")
    );

    rmSync(f.env.GC_MOLECULE_DIR, { recursive: true });
    assert.equal(manifest.exitCode, 1);
    assert.equal(
      readFileSync(path.join(archive, "stderr.log"), "utf-8"),
      result.stderr
    );
  }
});

test("trusted shell returns the raw failure and refuses duplicate execution", (t) => {
  const f = nativeFixture(t);

  const invocation = nativeShell(
    f,
    'printf "raw output\\n"\nprintf "raw error\\n" >&2\nexit 23'
  );

  const first = spawnSync("/bin/sh", invocation.args, invocation.options);
  assert.equal(first.status, 23, first.stderr);
  assert.equal(first.stdout, "raw output\n");
  assert.equal(first.stderr, "raw error\n");
  const second = spawnSync("/bin/sh", invocation.args, invocation.options);
  assert.notEqual(second.status, 0);
  assert.equal(second.stdout, "");
  assert.match(second.stderr, /EEXIST/u);
});

test("late descendants leave immutable hashes intact and raw streams unsealed", async (t) => {
  const f = nativeFixture(t);

  const archive = path.join(
    f.directory,
    "attempts/ps-root/ps-subject/checks/reviewed"
  );

  const release = path.join(f.city, "release-writer");

  const writer = `
    const fs = require("node:fs");
    const deadline = Date.now() + 5000;
    const wait = () => {
      if (!fs.existsSync(process.env.GC_CITY + "/release-writer")) {
        if (Date.now() > deadline) process.exit(1);
        return setTimeout(wait, 10);
      }
      fs.writeSync(1, "late stdout\\n");
      fs.writeSync(2, "late stderr\\n");
      fs.writeSync(5, "late qualification\\n");
    };
    wait();
  `;

  const invocation = nativeShell(
    f,
    `exec 5> "$skill_archive/qualification.log"
printf "early stdout\\n"
printf "early stderr\\n" >&2
printf "early qualification\\n" >&5
node -e '${writer}' &`
  );

  const child = spawn("/bin/sh", invocation.args, invocation.options);
  child.stdout.resume();
  child.stderr.resume();
  const closed = once(child, "close");
  const [exitCode] = await once(child, "exit");

  const manifest = JSON.parse(
    readFileSync(path.join(archive, "manifest.json"), "utf-8")
  );

  writeFileSync(release, "release after native exit and manifest creation\n");
  await closed;
  assert.equal(exitCode, 0);
  assert.equal(manifest.exitCode, 0);
  assert.equal(manifest.complete, true);

  for (const name of ["stdout", "stderr", "qualification"]) {
    assert.equal(
      readFileSync(path.join(archive, `${name}.log`), "utf-8"),
      `early ${name}\nlate ${name}\n`
    );
    assert.equal(
      readFileSync(path.join(archive, "sealed", `${name}.log`), "utf-8"),
      `early ${name}\n`
    );
    assert.equal(manifest.hashes[`${name}.log`], undefined);
  }

  for (const [file, hash] of Object.entries(manifest.hashes)) {
    assert.equal(
      createHash("sha256")
        .update(readFileSync(path.join(archive, file)))
        .digest("hex"),
      hash,
      `immutable hash changed for ${file}`
    );
  }

  assert.equal(manifest.completionScope, "captured-snapshots");
  assert.equal(manifest.rawLogs.sealed, false);
  assert.deepEqual(manifest.rawLogs.paths, [
    "stdout.log",
    "stderr.log",
    "qualification.log",
  ]);
});

test("SIGKILL leaves direct partial bytes without a false terminal manifest", async (t) => {
  const f = nativeFixture(t);

  const invocation = nativeShell(
    f,
    'printf "partial output\\n"\nprintf "partial error\\n" >&2\nprintf "ready\\n" >&3\nwhile :; do :; done'
  );

  const child = spawn("/bin/sh", invocation.args, invocation.options);
  t.after(() => child.kill("SIGKILL"));

  const archive = path.join(
    f.directory,
    "attempts",
    "ps-root",
    "ps-subject",
    "checks",
    "reviewed"
  );

  const output = path.join(archive, "stdout.log");
  await once(child.stdout, "data");

  assert.equal(readFileSync(output, "utf-8"), "partial output\n");
  const exited = once(child, "exit");
  child.kill("SIGKILL");
  await exited;
  rmSync(f.env.GC_MOLECULE_DIR, { recursive: true });
  assert.equal(readFileSync(output, "utf-8"), "partial output\n");
  assert.equal(
    readFileSync(path.join(archive, "stderr.log"), "utf-8"),
    "partial error\n"
  );
  assert.equal(
    JSON.parse(
      readFileSync(path.join(archive, "before/native/result.json"), "utf-8")
    ).candidate,
    "ps-candidate"
  );
  assert.equal(
    JSON.parse(readFileSync(path.join(archive, "started.json"), "utf-8"))
      .complete,
    false
  );
  assert.equal(existsSync(path.join(archive, "manifest.json")), false);
});

test("archival failure cannot turn a zero command exit into a passing check", (t) => {
  const f = nativeFixture(t);

  const invocation = nativeShell(
    f,
    'printf "completed command\\n"\nprintf "changed request" >| "$GC_CITY/.gc/skill-updates/ps-candidate/request.json"'
  );

  const result = spawnSync("/bin/sh", invocation.args, invocation.options);
  assert.equal(result.status, 1);

  const archive = path.join(
    f.directory,
    "attempts",
    "ps-root",
    "ps-subject",
    "checks",
    "reviewed"
  );

  assert.deepEqual(
    JSON.parse(readFileSync(path.join(archive, "exit.json"), "utf-8")),
    { exitCode: 0 }
  );
  assert.equal(existsSync(path.join(archive, "manifest.json")), false);
  assert.equal(
    readFileSync(path.join(archive, "stdout.log"), "utf-8"),
    "completed command\n"
  );
});

test("simultaneous archive reservations allow only one check invocation", async (t) => {
  const f = nativeFixture(t);
  const invocation = nativeShell(f, 'printf "one invocation\\n"');

  const run = async () => {
    const child = spawn("/bin/sh", invocation.args, invocation.options);
    const [code] = await once(child, "exit");

    return code;
  };

  const codes = await Promise.all([run(), run()]);
  assert.equal(codes.filter((code) => code === 0).length, 1);
  assert.equal(codes.filter((code) => code !== 0).length, 1);

  const archive = path.join(
    f.directory,
    "attempts",
    "ps-root",
    "ps-subject",
    "checks",
    "reviewed"
  );

  assert.equal(
    readFileSync(path.join(archive, "stdout.log"), "utf-8"),
    "one invocation\n"
  );
});

const git = (cwd, ...args) => {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  assert.equal(result.status, 0, result.stderr);

  return result.stdout.trim();
};

const save = (location, data) =>
  writeFileSync(location, `${JSON.stringify(data, null, 2)}\n`);

const commit = (cwd, subject) => {
  git(cwd, "add", ".");
  git(
    cwd,
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "-qm",
    subject
  );

  return git(cwd, "rev-parse", "HEAD");
};

const fixture = (t) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "skill-check-"));
  t.after(() => rmSync(directory, { force: true, recursive: true }));
  const checkout = path.join(directory, "checkout");
  const sourceCheckout = path.join(directory, "source");

  for (const cwd of [checkout, sourceCheckout]) {
    mkdirSync(cwd);
    git(cwd, "init", "-q");
  }

  git(
    sourceCheckout,
    "remote",
    "add",
    "origin",
    "https://github.com/owner/repo.git"
  );
  mkdirSync(path.join(sourceCheckout, "skills/demo"), { recursive: true });
  writeFileSync(path.join(sourceCheckout, "skills/demo/SKILL.md"), "new\n");
  const targetRevision = commit(sourceCheckout, "source");
  const targetHash = hashDirectory(path.join(sourceCheckout, "skills/demo"));
  const skillDirectory = path.join(checkout, ".agents/skills/demo");
  mkdirSync(skillDirectory, { recursive: true });
  writeFileSync(path.join(skillDirectory, "SKILL.md"), "old\n");
  const currentHash = hashDirectory(skillDirectory);

  const lock = {
    skills: {
      demo: {
        computedHash: currentHash,
        skillPath: "skills/demo/SKILL.md",
        source: "owner/repo",
        sourceType: "github",
      },
      other: { computedHash: "unchanged" },
    },
    version: 1,
  };

  save(path.join(checkout, "skills-lock.json"), lock);
  const base = commit(checkout, "base");
  writeFileSync(path.join(skillDirectory, "SKILL.md"), "new\n");
  lock.skills.demo.computedHash = targetHash;
  save(path.join(checkout, "skills-lock.json"), lock);
  const preparedCommit = commit(checkout, "update");

  const request = {
    candidate: "ps-abc",
    currentHash,
    scanBase: base,
    skill: "demo",
    skillPath: "skills/demo/SKILL.md",
    source: "owner/repo",
    targetHash,
    targetRevision,
  };

  return {
    base,
    checkout,
    commit: preparedCommit,
    directory,
    lock,
    request,
    sourceCheckout,
  };
};

test("only exact pinned one-skill content and one lock entry pass", (t) => {
  const f = fixture(t);
  assert.match(
    validateCommit(f.request, f.checkout, f.base, f.commit, f.sourceCheckout),
    /^[a-f0-9]{40}$/u
  );
  f.lock.skills.other.computedHash = "changed";
  save(path.join(f.checkout, "skills-lock.json"), f.lock);
  assert.throws(
    () =>
      validateCommit(
        f.request,
        f.checkout,
        f.base,
        commit(f.checkout, "extra"),
        f.sourceCheckout
      ),
    /one commit/u
  );
});

test("unrelated lock mutation is rejected even in a single commit", (t) => {
  const f = fixture(t);
  f.lock.skills.other.computedHash = "changed";
  save(path.join(f.checkout, "skills-lock.json"), f.lock);
  git(f.checkout, "add", ".");
  git(
    f.checkout,
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--amend",
    "--no-edit",
    "-q"
  );
  assert.throws(
    () =>
      validateCommit(
        f.request,
        f.checkout,
        f.base,
        git(f.checkout, "rev-parse", "HEAD"),
        f.sourceCheckout
      ),
    /Unrelated lock/u
  );
});

test("content mismatch and scope escape fail closed", (t) => {
  const f = fixture(t);
  assert.throws(
    () =>
      validateCommit(
        { ...f.request, targetHash: "a".repeat(64) },
        f.checkout,
        f.base,
        f.commit,
        f.sourceCheckout
      ),
    /lock mutation/u
  );
  assert.throws(
    () => validateRequest({ ...f.request, skillPath: "../SKILL.md" }),
    /Unsafe/u
  );
  writeFileSync(path.join(f.checkout, "unrelated.txt"), "escape");
  git(f.checkout, "add", ".");
  git(
    f.checkout,
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--amend",
    "--no-edit",
    "-q"
  );
  assert.throws(
    () =>
      validateCommit(
        f.request,
        f.checkout,
        f.base,
        git(f.checkout, "rev-parse", "HEAD"),
        f.sourceCheckout
      ),
    /escapes/u
  );
});

test("symlink content is never silently omitted", (t) => {
  const f = fixture(t);
  symlinkSync("/etc/passwd", path.join(f.sourceCheckout, "skills/demo/escape"));
  assert.throws(
    () => hashDirectory(path.join(f.sourceCheckout, "skills/demo")),
    /symlinks/u
  );
});

test("stale or self-authored review cannot pass the native gate", (t) => {
  const f = fixture(t);

  const metadata = Object.fromEntries(
    Object.entries({
      skill_current_hash: "currentHash",
      skill_name: "skill",
      skill_path: "skillPath",
      skill_scan_base: "scanBase",
      skill_source: "source",
      skill_target_hash: "targetHash",
      skill_target_revision: "targetRevision",
    }).map(([key, field]) => [key, f.request[field]])
  );

  save(path.join(f.directory, "request.json"), f.request);
  save(path.join(f.directory, "prepared.json"), {
    base: f.base,
    candidate: f.request.candidate,
    checkout: f.checkout,
    commit: f.commit,
    preparer: "worker-1",
    sourceCheckout: f.sourceCheckout,
  });

  save(path.join(f.directory, "qualified-prepared.json"), {
    base: f.base,
    candidate: f.request.candidate,
    commit: f.commit,
    tree: git(f.checkout, "rev-parse", "HEAD^{tree}"),
  });

  const review = {
    candidate: f.request.candidate,
    commit: f.base,
    evidence: ["Reviewed instruction changes"],
    reviewer: "reviewer-1",
    tree: git(f.checkout, "rev-parse", "HEAD^{tree}"),
    verdict: "pass",
  };

  save(path.join(f.directory, "reviewed.json"), review);

  const context = {
    anchor: { metadata },
    candidate: f.request.candidate,
    directory: f.directory,
    pointer: { stage: "reviewed" },
    subject: { assignee: "reviewer-1" },
  };

  assert.throws(() => checkStage("reviewed", context), /Stale/u);
  review.commit = f.commit;
  review.reviewer = "worker-1";
  save(path.join(f.directory, "reviewed.json"), review);
  assert.throws(() => checkStage("reviewed", context), /Independent/u);
});

test("an unrelated local commit under a scoped update is not a landing base", (t) => {
  const f = fixture(t);
  git(f.checkout, "reset", "--hard", f.base);
  writeFileSync(path.join(f.checkout, "unrelated.txt"), "unreviewed");
  const localBase = commit(f.checkout, "unreviewed local base");
  git(f.checkout, "cherry-pick", f.commit);
  const scoped = git(f.checkout, "rev-parse", "HEAD");
  assert.match(
    validateCommit(f.request, f.checkout, localBase, scoped, f.sourceCheckout),
    /^[a-f0-9]{40}$/u
  );
  assert.throws(
    () => validateLandingBase(localBase, f.base),
    /fresh remote main/u
  );
  assert.doesNotThrow(() => validateLandingBase(f.base, f.base));
});

test("remote source identity must match even when content hash is unchanged", (t) => {
  const f = fixture(t);
  const expected = f.lock.skills.demo;
  assert.doesNotThrow(() => validateRemoteEntry(expected, { ...expected }));

  for (const field of ["source", "sourceType", "skillPath"]) {
    assert.throws(
      () =>
        validateRemoteEntry(expected, { ...expected, [field]: "different" }),
      /Remote lock identity/u
    );
  }
});
