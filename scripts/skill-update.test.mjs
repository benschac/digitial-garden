import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import {
  chmodSync,
  mkdtempSync,
  renameSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
  readFileSync,
  realpathSync,
  existsSync,
  linkSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  main,
  validateLandingBase,
  validateRemoteEntry,
  hashDirectory,
  validateRequest,
  validateCommit,
  checkStage,
  beginCheckArchive,
  finishCheckArchive,
  resolveContext,
  resolveReceiptContext,
  resolveWriteContext,
  adoptPreparation,
  selectReceipt,
  writeImmutable,
  qualificationDecision,
  recordStage,
  qualifyResult,
  reuseQualification,
  collectScanEvidence,
  validateScanEvidence,
  validateScanReport,
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
        "gc.outcome": "pass",
        "gc.ralph_step_id": {
          integrated: "publish",
          prepared: "prepare",
          published: "publish",
          reviewed: "review",
        }[stage],
        "gc.root_bead_id": "ps-root",
        "gc.session_id": "psc-worker",
        "gc.session_name": "gc__worker-psc-worker",
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

const fixture = (t, customizeLock = () => {}) => {
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

  customizeLock(lock);
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

const bytesHash = (bytes) => createHash("sha256").update(bytes).digest("hex");

const recoveryFixture = (t, nested = false) => {
  const n = nativeFixture(t, "prepared");
  const f = fixture(t);
  const checkout = path.join(n.directory, "checkout");
  const sourceCheckout = path.join(n.directory, "source");
  renameSync(f.checkout, checkout);
  renameSync(f.sourceCheckout, sourceCheckout);
  git(
    checkout,
    "remote",
    "add",
    "origin",
    "https://github.com/benschac/digitial-garden.git"
  );
  const request = { ...f.request, candidate: "ps-candidate" };
  save(path.join(n.directory, "request.json"), request);
  const preparedPath = nested ? "prepare/prepared.json" : "prepared.json";

  if (nested) {
    rmSync(path.join(n.directory, "prepared.json"));
    mkdirSync(path.join(n.directory, "prepare"));
  }

  const prepared = {
    base: f.base,
    candidate: request.candidate,
    checkout,
    commit: f.commit,
    preparer: "psc-original",
    sourceCheckout,
  };

  save(path.join(n.directory, preparedPath), prepared);

  const tree = git(checkout, "rev-parse", "HEAD^{tree}");

  const authorization = {
    adopter: "psc-worker",
    base: f.base,
    candidate: request.candidate,
    commit: f.commit,
    landingHistory: [],
    lineageComplete: true,
    originalPreparer: "psc-original",
    originalStep: { path: "original-step.json", sha256: "f".repeat(64) },
    prepared: {
      path: preparedPath,
      sha256: bytesHash(readFileSync(path.join(n.directory, preparedPath))),
    },
    qualification: { mode: "required" },
    repair: "ps-repair",
    requestHash: bytesHash(
      readFileSync(path.join(n.directory, "request.json"))
    ),
    root: "ps-root",
    schema: 2,
    step: "ps-subject",
    tree,
  };

  save(path.join(n.directory, "original-step.json"), {
    assignee: "",
    id: "ps-oldprepare",
    metadata: {
      "gc.outcome": "pass",
      "gc.ralph_step_id": "prepare",
      "gc.root_bead_id": "ps-oldroot",
      "gc.session_id": "psc-original",
      "gc.session_name": "gc__original-psc-original",
    },
    status: "closed",
  });
  authorization.originalStep.sha256 = bytesHash(
    readFileSync(path.join(n.directory, "original-step.json"))
  );
  mkdirSync(path.join(n.directory, "authorizations"));

  const authorize = () => {
    const file = path.join(n.directory, "authorizations/ps-root.json");
    save(file, authorization);
    const hash = bytesHash(readFileSync(file));
    n.rows["ps-root"].metadata.skill_receipt_schema = "2";
    n.rows["ps-root"].metadata.skill_recovery_repair_bead = "ps-repair";
    n.rows["ps-root"].metadata.skill_recovery_authorization_sha256 = hash;
    n.rows["ps-repair"] = {
      id: "ps-repair",
      metadata: { "skill_recovery_authorization.ps-root.sha256": hash },
    };
  };

  n.rows["ps-subject"].status = "in_progress";
  n.rows["ps-subject"].metadata["gc.session_name"] = "gc__worker-psc-worker";
  n.rows["ps-root"].metadata["gc.drain_control_id"] = "ps-drain";
  n.rows["ps-convoy"].metadata["gc.drain_control_id"] = "ps-drain";
  n.rows["ps-candidate"].metadata = {
    "gc.exclusive_drain_reservation": "ps-drain",
    ...Object.fromEntries(
      Object.entries({
        skill_current_hash: "currentHash",
        skill_name: "skill",
        skill_path: "skillPath",
        skill_scan_base: "scanBase",
        skill_source: "source",
        skill_target_hash: "targetHash",
        skill_target_revision: "targetRevision",
      }).map(([key, field]) => [key, request[field]])
    ),
  };
  n.rows["ps-drain"] = {
    id: "ps-drain",
    metadata: {
      "gc.drain_manifest.v1": JSON.stringify({
        rows: [
          {
            item_root_id: "ps-root",
            member_id: request.candidate,
            unit_convoy_id: "ps-convoy",
          },
        ],
        version: 1,
      }),
    },
    status: "in_progress",
  };
  n.env.GC_SESSION_ID = "psc-worker";
  n.env.GC_SESSION_NAME = "gc__worker-psc-worker";
  n.env.BEADS_ACTOR = "psc-worker";
  rmSync(path.join(n.artifacts, "result.json"));
  authorize();
  const context = () => resolveWriteContext(n.env, n.read, () => "ps-subject");

  return {
    ...n,
    ...f,
    authorization,
    authorize,
    checkout,
    context,
    directory: n.directory,
    prepared,
    preparedPath,
    request,
    sourceCheckout,
    tree,
  };
};

test("schema-2 adoption preserves exact retained identity and isolates root receipts", (t) => {
  const f = recoveryFixture(t);
  const original = readFileSync(path.join(f.directory, f.preparedPath));
  const request = readFileSync(path.join(f.directory, "request.json"));
  const context = f.context();
  const envelope = adoptPreparation(context);
  assert.equal(envelope.originalPreparer, "psc-original");
  assert.equal(envelope.adopter, "psc-worker");
  assert.deepEqual(adoptPreparation(f.context()), envelope);
  const pointer = selectReceipt("prepared", 0, "absent", f.context());
  assert.equal(pointer.root, "ps-root");
  assert.equal(
    checkStage("prepared", resolveContext(f.env, f.read)).commit,
    f.commit
  );
  assert.deepEqual(
    readFileSync(path.join(f.directory, f.preparedPath)),
    original
  );
  assert.deepEqual(
    readFileSync(path.join(f.directory, "request.json")),
    request
  );
  f.rows["ps-subject"].status = "closed";
  f.rows["ps-subject"].assignee = "";
  assert.doesNotThrow(() =>
    checkStage("prepared", resolveContext(f.env, f.read))
  );
  assert.throws(() => f.context(), /live claim/u);
});

test("native authorization rejects stale claims, foreign reservations and schema fallback", (t) => {
  const f = recoveryFixture(t);
  assert.throws(
    () => resolveWriteContext(f.env, f.read, () => "ps-foreign"),
    /live claim/u
  );
  assert.throws(
    () =>
      resolveWriteContext(
        { ...f.env, GC_SESSION_ID: "psc-foreign" },
        f.read,
        () => "ps-subject"
      ),
    /live claim/u
  );
  delete f.rows["ps-repair"].metadata[
    "skill_recovery_authorization.ps-root.sha256"
  ];
  assert.throws(() => f.context(), /explicit repair/u);
  f.authorize();
  f.rows["ps-candidate"].metadata["gc.exclusive_drain_reservation"] =
    "ps-foreign";
  assert.throws(() => f.context(), /reservation/u);
  f.rows["ps-candidate"].metadata["gc.exclusive_drain_reservation"] =
    "ps-drain";
  f.rows["ps-drain"].metadata["gc.drain_manifest.v1"] = JSON.stringify({
    rows: [],
    version: 1,
  });
  assert.throws(() => f.context(), /manifest/u);
  f.rows["ps-root"].metadata.skill_receipt_schema = "3";
  assert.throws(() => resolveReceiptContext(f.env, f.read), /schema-2/u);
  delete f.rows["ps-root"].metadata.skill_receipt_schema;
  assert.throws(() => resolveReceiptContext(f.env, f.read), /Contradictory/u);
});

test("adoption rejects source, request, original preparer and dirty-tree substitutions", (t) => {
  const f = recoveryFixture(t);
  const original = readFileSync(path.join(f.directory, f.preparedPath));
  f.prepared.preparer = "psc-worker";
  save(path.join(f.directory, f.preparedPath), f.prepared);
  assert.throws(() => adoptPreparation(f.context()), /digest/u);
  writeFileSync(path.join(f.directory, f.preparedPath), original);
  writeFileSync(path.join(f.checkout, "unexpected"), "dirty");
  assert.throws(() => adoptPreparation(f.context()), /Dirty/u);
  rmSync(path.join(f.checkout, "unexpected"));
  git(
    f.sourceCheckout,
    "remote",
    "set-url",
    "origin",
    "https://github.com/foreign/source.git"
  );
  assert.throws(() => adoptPreparation(f.context()), /origin/u);
  git(
    f.sourceCheckout,
    "remote",
    "set-url",
    "origin",
    "https://github.com/owner/repo.git"
  );
  const request = readFileSync(path.join(f.directory, "request.json"));
  save(path.join(f.directory, "request.json"), {
    ...f.request,
    scanBase: "a".repeat(40),
  });
  assert.throws(() => f.context(), /request/u);
  writeFileSync(path.join(f.directory, "request.json"), request);
  f.authorization.prepared.path = "../escape.json";
  f.authorize();
  assert.throws(() => adoptPreparation(f.context()), /Unsafe/u);
  assert.deepEqual(
    readFileSync(path.join(f.directory, f.preparedPath)),
    original
  );
});

test("incomplete adoption remains a hold and immutable writes never replace conflicts", async (t) => {
  const f = recoveryFixture(t);
  adoptPreparation(f.context());
  const root = path.join(f.directory, "attempts/ps-root");
  rmSync(path.join(root, "manifest.json"));
  assert.throws(() => adoptPreparation(f.context()), /Incomplete/u);
  const output = path.join(f.city, "immutable");
  mkdirSync(output);
  writeImmutable(output, "receipt.json", "first");
  assert.doesNotThrow(() => writeImmutable(output, "receipt.json", "first"));
  assert.throws(
    () => writeImmutable(output, "receipt.json", "second"),
    /Conflicting/u
  );
  assert.equal(
    readFileSync(path.join(output, "receipt.json"), "utf-8"),
    "first"
  );

  const modulePath = fileURLToPath(
    new URL("skill-update.mjs", import.meta.url)
  );

  const run = async (value) => {
    const child = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import {writeImmutable} from ${JSON.stringify(modulePath)};writeImmutable(process.argv[1], 'racing.json', process.argv[2]);`,
        output,
        value,
      ],
      { stdio: "ignore" }
    );

    const [code] = await once(child, "exit");

    return code;
  };

  const codes = await Promise.all([run("one"), run("two")]);
  assert.equal(codes.filter((code) => code === 0).length, 1);
  assert.ok(
    ["one", "two"].includes(
      readFileSync(path.join(output, "racing.json"), "utf-8")
    )
  );
});

test("qualification is strict for existing legacy evidence and exact for approved reuse", (t) => {
  const f = recoveryFixture(t);

  const qualification = {
    base: f.base,
    candidate: f.request.candidate,
    commit: f.commit,
    tree: f.tree,
  };

  save(path.join(f.directory, "qualified-prepared.json"), qualification);
  writeFileSync(
    path.join(f.directory, "legacy.log"),
    "historical successful execution\n"
  );
  adoptPreparation(f.context());
  selectReceipt("prepared", 0, "absent", f.context());
  assert.throws(
    () => qualificationDecision("prepared", resolveContext(f.env, f.read)),
    /provenance/u
  );

  const snapshot = readFileSync(
    path.join(f.directory, "qualified-prepared.json")
  );

  f.authorization.qualification = {
    log: {
      path: "legacy.log",
      sha256: bytesHash(readFileSync(path.join(f.directory, "legacy.log"))),
    },
    mode: "reused",
    policy: "a".repeat(64),
    receipt: { path: "qualified-prepared.json", sha256: bytesHash(snapshot) },
    trustedOrigin: "explicitly reviewed synthetic wrapper invocation",
  };
  f.authorize();
  assert.throws(
    () => qualificationDecision("prepared", resolveContext(f.env, f.read)),
    /binding/u
  );
  assert.deepEqual(
    readFileSync(path.join(f.directory, "qualified-prepared.json")),
    snapshot
  );
});

const approveReuse = (f) => {
  save(path.join(f.directory, "qualified-prepared.json"), {
    base: f.base,
    candidate: f.request.candidate,
    commit: f.commit,
    tree: f.tree,
  });
  writeFileSync(
    path.join(f.directory, "legacy.log"),
    "synthetic original qualification output\n"
  );
  f.authorization.qualification = {
    log: {
      path: "legacy.log",
      sha256: bytesHash(readFileSync(path.join(f.directory, "legacy.log"))),
    },
    mode: "reused",
    policy: "f".repeat(64),
    receipt: {
      path: "qualified-prepared.json",
      sha256: bytesHash(
        readFileSync(path.join(f.directory, "qualified-prepared.json"))
      ),
    },
    trustedOrigin:
      "synthetic independently approved original wrapper execution",
  };
  f.authorize();
};

const wrapperFixture = (f) => {
  const bin = path.join(f.city, "wrapper-bin");
  mkdirSync(bin);
  const beads = path.join(f.city, "wrapper-beads.json");
  save(beads, f.rows);
  writeFileSync(
    path.join(bin, "gc"),
    '#!/usr/bin/env node\nconst fs=require("node:fs");console.log(JSON.stringify([JSON.parse(fs.readFileSync(process.env.SKILL_TEST_BEADS))[process.argv.at(-2)]]));\n',
    { mode: 0o700 }
  );
  writeFileSync(
    path.join(bin, "bun"),
    '#!/bin/sh\nprintf "%s\\n" "$*" >> "$SKILL_TEST_COMMANDS"\n[ "$SKILL_TEST_FAIL" != "$1" ]\n',
    { mode: 0o700 }
  );

  const wrapper = fileURLToPath(
    new URL(
      "../gascity/skill-updates/assets/checks/qualify.sh",
      import.meta.url
    )
  );

  const script = readFileSync(wrapper, "utf-8").replace(
    /^PATH=.*$/mu,
    "PATH=$SKILL_TEST_PATH"
  );

  const commands = path.join(f.city, "commands.log");

  const run = (failure = "") => {
    save(beads, f.rows);

    return spawnSync("/bin/sh", ["-c", script, wrapper, "prepared"], {
      encoding: "utf-8",
      env: {
        ...f.env,
        SKILL_TEST_BEADS: beads,
        SKILL_TEST_COMMANDS: commands,
        SKILL_TEST_FAIL: failure,
        SKILL_TEST_PATH: `${bin}:${process.env.PATH}`,
      },
    });
  };

  return { commands, run };
};

test("authorized reuse executes zero install or verify commands and preserves prior bytes", (t) => {
  const f = recoveryFixture(t, true);
  approveReuse(f);
  const old = readFileSync(path.join(f.directory, "qualified-prepared.json"));
  const log = readFileSync(path.join(f.directory, "legacy.log"));
  adoptPreparation(f.context());
  selectReceipt("prepared", 0, "absent", f.context());
  f.rows["ps-subject"].status = "closed";
  f.rows["ps-subject"].assignee = "";
  const wrapper = wrapperFixture(f);
  const result = wrapper.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(wrapper.commands), false);

  const receipt = JSON.parse(
    readFileSync(
      path.join(f.directory, "attempts/ps-root/qualified-prepared.json")
    )
  );

  assert.equal(receipt.mode, "reused");

  const decision = JSON.parse(
    readFileSync(
      path.join(f.directory, "attempts/ps-root/qualification-decision.json")
    )
  );

  assert.equal(decision.installExecuted, false);
  assert.equal(decision.verifyExecuted, false);
  assert.deepEqual(
    readFileSync(path.join(f.directory, "qualified-prepared.json")),
    old
  );
  assert.deepEqual(readFileSync(path.join(f.directory, "legacy.log")), log);
  assert.notEqual(wrapper.run().status, 0);
  assert.equal(existsSync(wrapper.commands), false);
});

test("missing qualification executes exactly one trusted qualification; failure emits no success", (t) => {
  for (const failure of ["", "install", "run"]) {
    const f = recoveryFixture(t);
    adoptPreparation(f.context());
    selectReceipt("prepared", 0, "absent", f.context());
    f.rows["ps-subject"].status = "closed";
    f.rows["ps-subject"].assignee = "";
    const wrapper = wrapperFixture(f);
    const result = wrapper.run(failure);
    assert.equal(result.status === 0, failure === "", result.stderr);
    const commands = readFileSync(wrapper.commands, "utf-8").trim().split("\n");
    assert.equal(commands.length, failure === "install" ? 1 : 2);
    assert.equal(commands[0], "install --frozen-lockfile --ignore-scripts");

    if (commands.length === 2) {
      assert.equal(commands[1], "run verify");
    }

    const receipt = path.join(
      f.directory,
      "attempts/ps-root/qualified-prepared.json"
    );

    assert.equal(existsSync(receipt), failure === "");

    const archived = path.join(
      f.directory,
      "attempts/ps-root/ps-subject/checks/prepared"
    );

    const manifest = JSON.parse(
      readFileSync(path.join(archived, "manifest.json"))
    );

    assert.equal(manifest.exitCode === 0, failure === "");
    assert.notEqual(wrapper.run(failure).status, 0);
    assert.equal(
      readFileSync(wrapper.commands, "utf-8").trim().split("\n").length,
      commands.length
    );
  }
});

const switchSubject = (f, step, role, executor) => {
  const artifact = path.join(f.city, ".gc/molecules/ps-root/artifacts", step);
  mkdirSync(artifact, { recursive: true });
  f.rows[step] = {
    assignee: executor,
    id: step,
    metadata: {
      "gc.iteration": "1",
      "gc.outcome": "pass",
      "gc.ralph_step_id": role,
      "gc.root_bead_id": "ps-root",
      "gc.session_id": executor,
      "gc.session_name": `gc__role-${executor}`,
    },
    status: "in_progress",
  };
  f.env.GC_BEAD_ID = step;
  f.env.GC_ARTIFACT_DIR = artifact;
  f.env.GC_SESSION_ID = executor;
  f.env.GC_SESSION_NAME = `gc__role-${executor}`;
  f.env.BEADS_ACTOR = executor;

  return resolveWriteContext(f.env, f.read, () => step);
};

const preparedRecovery = (t, adapt = () => {}) => {
  const f = recoveryFixture(t);
  adapt(f);
  approveReuse(f);
  adoptPreparation(f.context());
  selectReceipt("prepared", 0, "absent", f.context());
  f.rows["ps-subject"].status = "closed";
  f.rows["ps-subject"].assignee = "";
  reuseQualification("prepared", resolveContext(f.env, f.read));

  return f;
};

test("review binds exact native reviewer and rejects original preparer and adopter", (t) => {
  const f = preparedRecovery(t);

  const review = {
    candidate: f.request.candidate,
    commit: f.commit,
    evidence: ["Exact synthetic source and recovery envelope inspected"],
    reviewer: "psc-reviewer",
    tree: f.tree,
    verdict: "pass",
  };

  const context = switchSubject(f, "ps-reviewstep", "review", "psc-reviewer");
  recordStage("reviewed", 0, review, context);
  selectReceipt("reviewed", 0, "absent", context);
  assert.equal(
    checkStage("reviewed", resolveContext(f.env, f.read)).commit,
    f.commit
  );
  const file = path.join(context.receiptDirectory, "reviewed.json");
  const original = readFileSync(file);

  for (const reviewer of ["psc-original", "psc-worker", "psc-foreign"]) {
    const receipt = JSON.parse(original);
    receipt.reviewer = reviewer;
    save(file, receipt);
    assert.throws(
      () => checkStage("reviewed", resolveContext(f.env, f.read)),
      /digest|review/u
    );
    writeFileSync(file, original);
  }

  f.rows["ps-reviewstep"].metadata["gc.session_id"] = "psc-foreign";
  assert.throws(() => resolveContext(f.env, f.read), /ownership/u);
});

const localRemote = (f) => {
  const remote = path.join(f.city, "remote.git");
  git(f.city, "init", "--bare", remote);
  git(f.checkout, "push", remote, `${f.base}:refs/heads/main`);
  const bin = path.join(f.city, "git-bin");
  mkdirSync(bin);

  const realGit = spawnSync("which", ["git"], {
    encoding: "utf-8",
  }).stdout.trim();

  assert.match(realGit, /^\/[a-zA-Z0-9_/.+-]+$/u);
  writeFileSync(
    path.join(bin, "git"),
    `#!/bin/sh
if [ "$1" = fetch ] && [ "$#" -ge 4 ] && [ "$3" = https://github.com/benschac/digitial-garden.git ]; then
  exec ${realGit} fetch --no-tags "$SKILL_TEST_REMOTE" "$4"
fi
exec ${realGit} "$@"
`,
    { mode: 0o700 }
  );

  return { bin, remote };
};

const withLocalRemote = (f, fn) => {
  const remote = localRemote(f);
  const previous = process.env.PATH;
  process.env.PATH = `${remote.bin}:${previous}`;
  process.env.SKILL_TEST_REMOTE = remote.remote;

  try {
    return fn(remote.remote);
  } finally {
    process.env.PATH = previous;
    delete process.env.SKILL_TEST_REMOTE;
  }
};

test("second real-base landing preserves first bytes and requires exact qualification and acceptance selection", (t) => {
  const f = preparedRecovery(t);
  let context = switchSubject(f, "ps-reviewstep", "review", "psc-reviewer");
  recordStage(
    "reviewed",
    0,
    {
      commit: f.commit,
      evidence: ["Synthetic exact review"],
      reviewer: "psc-reviewer",
      tree: f.tree,
      verdict: "pass",
    },
    context
  );
  selectReceipt("reviewed", 0, "absent", context);
  f.rows["ps-reviewstep"].status = "closed";
  f.rows["ps-reviewstep"].assignee = "";
  context = switchSubject(f, "ps-publishstep", "publish", "psc-publisher");

  const publishCheckout = path.join(
    f.directory,
    "attempts/ps-root/landing/1/checkout"
  );

  mkdirSync(path.dirname(publishCheckout), { recursive: true });
  git(f.city, "clone", f.checkout, publishCheckout);
  git(
    publishCheckout,
    "remote",
    "set-url",
    "origin",
    "https://github.com/benschac/digitial-garden.git"
  );

  git(publishCheckout, "update-ref", "refs/remotes/origin/main", f.base);

  const integration = {
    base: f.base,
    branch: "main",
    checkout: publishCheckout,
    commit: f.commit,
    preparedCommit: f.commit,
  };

  withLocalRemote(f, (remote) => {
    recordStage("integrated", 1, integration, context);

    const integratedFile = path.join(
      context.receiptDirectory,
      "landing/1/integrated.json"
    );

    const exactIntegration = readFileSync(integratedFile);
    save(integratedFile, {
      ...JSON.parse(exactIntegration),
      checkout: f.checkout,
    });
    assert.throws(
      () => selectReceipt("integrated", 1, "absent", context),
      /does not belong/u
    );
    writeFileSync(integratedFile, exactIntegration);
    const unknown = path.join(context.receiptDirectory, "landing/1/unknown");
    writeFileSync(unknown, "preserved until explicit reconciliation");
    assert.throws(
      () => selectReceipt("integrated", 1, "absent", context),
      /Unknown landing/u
    );
    rmSync(unknown);
    const first = selectReceipt("integrated", 1, "absent", context);
    const pointerFile = path.join(context.artifactDirectory, "result.json");
    const firstPointerBytes = readFileSync(pointerFile);

    const firstReceipt = readFileSync(
      path.join(context.receiptDirectory, "landing/1/integrated.json")
    );

    assert.deepEqual(
      selectReceipt("integrated", 1, bytesHash(firstPointerBytes), context),
      first
    );
    assert.throws(
      () =>
        selectReceipt("integrated", 4, bytesHash(firstPointerBytes), context),
      /limit/u
    );
    assert.throws(
      () =>
        selectReceipt("published", 1, bytesHash(firstPointerBytes), context),
      /ENOENT/u
    );
    const remoteWork = path.join(f.city, "remote-work");
    git(f.city, "clone", f.checkout, remoteWork);
    git(remoteWork, "reset", "--hard", f.base);
    writeFileSync(path.join(remoteWork, "unrelated.txt"), "remote advance");
    const nextBase = commit(remoteWork, "unrelated remote base");
    git(remoteWork, "push", remote, `${nextBase}:refs/heads/main`);

    const secondCheckout = path.join(
      context.receiptDirectory,
      "landing/2/checkout"
    );

    mkdirSync(path.dirname(secondCheckout));
    git(f.city, "clone", f.checkout, secondCheckout);
    git(
      secondCheckout,
      "remote",
      "set-url",
      "origin",
      "https://github.com/benschac/digitial-garden.git"
    );
    git(secondCheckout, "update-ref", "refs/remotes/origin/main", f.base);
    git(secondCheckout, "fetch", remote, "refs/heads/main");
    git(secondCheckout, "checkout", "--detach", nextBase);
    git(
      secondCheckout,
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "cherry-pick",
      f.commit
    );
    const secondCommit = git(secondCheckout, "rev-parse", "HEAD");
    recordStage(
      "integrated",
      2,
      {
        ...integration,
        base: nextBase,
        checkout: secondCheckout,
        commit: secondCommit,
      },
      context
    );
    assert.throws(
      () =>
        selectReceipt("integrated", 2, bytesHash(firstPointerBytes), context),
      /ENOENT/u
    );
    writeImmutable(
      path.join(context.receiptDirectory, "landing/2"),
      "remote-race.json",
      `${JSON.stringify({ nextBase, previousBase: f.base, previousSelector: bytesHash(firstPointerBytes) })}\n`
    );

    const second = selectReceipt(
      "integrated",
      2,
      bytesHash(firstPointerBytes),
      context
    );

    assert.equal(first.attempt, 1);
    assert.equal(second.attempt, 2);
    assert.deepEqual(
      readFileSync(
        path.join(context.receiptDirectory, "landing/1/integrated.json")
      ),
      firstReceipt
    );
    assert.deepEqual(
      readFileSync(
        path.join(
          context.receiptDirectory,
          `landing/2/selectors/${bytesHash(firstPointerBytes)}.json`
        )
      ),
      firstPointerBytes
    );
    assert.throws(
      () =>
        selectReceipt(
          "integrated",
          1,
          bytesHash(readFileSync(pointerFile)),
          context
        ),
      /transition/u
    );
    const checked = checkStage("integrated", resolveContext(f.env, f.read));
    assert.equal(checked.base, nextBase);
    assert.equal(checked.commit, secondCommit);
    assert.equal(
      qualificationDecision("integrated", resolveContext(f.env, f.read)).mode,
      "required"
    );
    const archive = beginCheckArchive("integrated", f.env, f.read);
    qualifyResult("integrated", checked, resolveContext(f.env, f.read));
    writeFileSync(path.join(archive, "stdout.log"), "synthetic trusted output");
    writeFileSync(path.join(archive, "stderr.log"), "");
    writeFileSync(
      path.join(archive, "qualification.log"),
      "synthetic exact integration qualification"
    );
    writeFileSync(path.join(archive, "exit.json"), '{"exitCode":0}');
    finishCheckArchive("integrated", 0, f.env, f.read);

    const selectedIntegration = JSON.parse(
      readFileSync(
        path.join(context.receiptDirectory, "landing/2/integrated.json")
      )
    );

    recordStage("published", 2, selectedIntegration, context);
    git(secondCheckout, "push", remote, `${secondCommit}:refs/heads/main`);

    const sealedQualification = path.join(archive, "sealed/qualification.log");
    const sealedBytes = readFileSync(sealedQualification);
    writeFileSync(sealedQualification, "changed qualification evidence");
    assert.throws(
      () =>
        selectReceipt(
          "published",
          2,
          bytesHash(readFileSync(pointerFile)),
          context
        ),
      /evidence digest/u
    );
    writeFileSync(sealedQualification, sealedBytes);
    rmSync(sealedQualification);
    assert.throws(
      () =>
        selectReceipt(
          "published",
          2,
          bytesHash(readFileSync(pointerFile)),
          context
        ),
      /ENOENT/u
    );
    writeFileSync(sealedQualification, sealedBytes);

    const published = selectReceipt(
      "published",
      2,
      bytesHash(readFileSync(pointerFile)),
      context
    );

    assert.equal(published.stage, "published");
    f.rows["ps-publishstep"].status = "closed";
    f.rows["ps-publishstep"].assignee = "";

    const acceptance = switchSubject(
      f,
      "ps-acceptstep",
      "accept",
      "psc-accepter"
    );

    const pointer = selectReceipt("accepted", 2, "absent", acceptance);
    assert.equal(pointer.acceptance, true);
    assert.equal(
      checkStage("published", resolveContext(f.env, f.read)).commit,
      secondCommit
    );
    switchSubject(f, "ps-directaccept", "accept", "psc-directaccepter");
    const direct = f.rows["ps-directaccept"];
    delete direct.metadata["gc.ralph_step_id"];
    direct.metadata["gc.step_id"] = "update-skill.accept";
    direct.metadata["gc.step_ref"] = "update-skill.accept";
    const directContext = resolveWriteContext(f.env, f.read, () => direct.id);
    assert.equal(
      selectReceipt("accepted", 2, "absent", directContext).acceptance,
      true
    );
    assert.equal(
      checkStage("published", resolveContext(f.env, f.read)).commit,
      secondCommit
    );
    const directArchive = beginCheckArchive("published", f.env, f.read);
    assert.equal(
      JSON.parse(readFileSync(path.join(directArchive, "subject.json")))
        .metadata["gc.step_id"],
      "update-skill.accept"
    );
    const oldPublished = JSON.parse(readFileSync(pointerFile));
    oldPublished.attempt = 1;
    save(pointerFile, oldPublished);
    assert.throws(
      () => checkStage("published", resolveContext(f.env, f.read)),
      /current published/u
    );
  });
});

test("singleton native aliases bind exact durable sessions and claims", async (t) => {
  const singletonFixture = () => {
    const f = nativeFixture(t, "integrated");
    const step = f.rows["ps-subject"];
    step.assignee = "personal-site/skills.publisher";
    step.started_at = "2026-11-04T21:26:38Z";
    step.closed_at = "2026-11-04T21:35:59Z";
    Object.assign(step.metadata, {
      "gc.claimed_at": "2026-11-04T21:26:39Z",
      "gc.routed_to": "personal-site/skills.publisher",
      "gc.run_target": "skills.publisher",
      "gc.session_id": "psc-wisp-worker",
      "gc.session_name": "skills__publisher-psc-wisp-worker",
    });

    const session = {
      id: "psc-wisp-worker",
      issue_type: "session",
      metadata: {
        alias: "personal-site/skills.publisher",
        canonical_instance_name: "personal-site/skills.publisher",
        session_name: "skills__publisher-psc-wisp-worker",
        state: "drained",
        template: "personal-site/skills.publisher",
      },
      status: "closed",
    };

    f.rows[session.id] = session;

    return { ...f, session, step };
  };

  await t.test(
    "closed native alias retains durable executor after drain",
    () => {
      const f = singletonFixture();
      const context = resolveContext(f.env, f.read);
      assert.equal(context.executor, "psc-wisp-worker");
      assert.deepEqual(context.ownerIdentities, [
        "psc-wisp-worker",
        "skills__publisher-psc-wisp-worker",
      ]);
    }
  );

  await Promise.all(
    ["active", "awake"].map((state) =>
      t.test(
        `live ${state} singleton requires its exact session claim and lease`,
        () => {
          const f = singletonFixture();
          f.step.status = "in_progress";
          delete f.step.closed_at;
          f.step.lease_expires_at = "2999-01-01T00:00:00Z";
          f.session.status = "open";
          f.session.metadata.state = state;
          f.session.metadata.current_claim_bead_id = f.step.id;
          assert.equal(
            resolveContext(f.env, f.read).executor,
            "psc-wisp-worker"
          );
        }
      )
    )
  );

  await t.test(
    "CLI reads alias executor from city and work from rig store",
    () => {
      const f = singletonFixture();
      const invocation = nativeShell(f, 'printf "singleton check\\n"');
      invocation.args[1] = invocation.args[1].replace(
        "skill_archive_begin reviewed",
        "skill_archive_begin integrated"
      );
      const bin = path.join(f.city, "bin", "gc");
      writeFileSync(
        bin,
        '#!/usr/bin/env node\nconst fs = require("node:fs"); const id = process.argv.at(-2); if ((id === "psc-wisp-worker") === process.argv.includes("--rig")) process.exit(1); console.log(JSON.stringify([JSON.parse(fs.readFileSync(process.env.SKILL_TEST_BEADS))[id]]));\n',
        { mode: 0o700 }
      );
      const result = spawnSync("/bin/sh", invocation.args, invocation.options);
      assert.equal(result.status, 0, result.stderr);

      const manifest = JSON.parse(
        readFileSync(
          path.join(
            f.directory,
            "attempts/ps-root/ps-subject/checks/integrated/preflight/manifest.json"
          )
        )
      );

      assert.equal(manifest.executorSessionId, "psc-wisp-worker");
      rmSync(f.env.GC_MOLECULE_DIR, { recursive: true });
      assert.equal(
        readFileSync(
          path.join(
            f.directory,
            "attempts/ps-root/ps-subject/checks/integrated/preflight/stdout.log"
          ),
          "utf-8"
        ),
        "singleton check\n"
      );
    }
  );

  await t.test("Ralph body child preserves its bare owner role", () => {
    const f = singletonFixture();
    f.step.metadata["gc.step_id"] = "execute";
    f.step.metadata["gc.step_ref"] = "update-skill.publish.iteration.1.execute";
    assert.equal(resolveContext(f.env, f.read).executor, "psc-wisp-worker");
  });

  await t.test(
    "direct native acceptance binds its exact qualified role",
    () => {
      const f = singletonFixture();
      delete f.step.metadata["gc.ralph_step_id"];
      f.step.metadata["gc.step_id"] = "update-skill.accept";
      f.step.metadata["gc.step_ref"] = "update-skill.accept";
      f.step.status = "in_progress";
      delete f.step.closed_at;
      f.step.lease_expires_at = "2999-01-01T00:00:00Z";
      f.session.status = "open";
      f.session.metadata.state = "awake";
      f.session.metadata.current_claim_bead_id = f.step.id;
      assert.equal(resolveContext(f.env, f.read).executor, "psc-wisp-worker");

      for (const metadata of [
        { "gc.step_id": "foreign.accept", "gc.step_ref": "foreign.accept" },
        { "gc.step_ref": "foreign.accept" },
        { "gc.step_id": "accept" },
        { "gc.ralph_step_id": "publish" },
      ]) {
        const original = { ...f.step.metadata };
        Object.assign(f.step.metadata, metadata);
        assert.throws(() => resolveContext(f.env, f.read));
        f.step.metadata = original;
      }

      f.rows["ps-root"].metadata["gc.formula_name"] = "foreign";
      assert.throws(() => resolveContext(f.env, f.read));
    }
  );

  const mutations = {
    "foreign live claim": (f) => {
      f.step.status = "in_progress";
      f.step.lease_expires_at = "2999-01-01T00:00:00Z";
      f.session.status = "open";
      f.session.metadata.state = "active";
      f.session.metadata.current_claim_bead_id = "ps-other";
    },
    "foreign rig": (f) => {
      f.session.metadata.alias = "foreign/skills.publisher";
    },
    "legacy pooled session": (f) => {
      f.session.metadata.pool_slot = "2";
    },
    "missing claim": (f) => {
      delete f.step.metadata["gc.claimed_at"];
    },
    "missing lease": (f) => {
      f.step.status = "in_progress";
    },
    "missing session": (f) => {
      delete f.rows["psc-wisp-worker"];
    },
    "missing start": (f) => {
      delete f.step.started_at;
    },
    "not session": (f) => {
      f.session.issue_type = "task";
    },
    "pooled session": (f) => {
      f.session.metadata.canonical_pool_slot = "2";
    },
    "stale lease": (f) => {
      f.step.status = "in_progress";
      f.step.lease_expires_at = "2000-01-01T00:00:00Z";
    },
    "wrong assignee": (f) => {
      f.step.assignee = "personal-site/skills.reviewer";
    },
    "wrong canonical instance": (f) => {
      f.session.metadata.canonical_instance_name =
        "personal-site/skills.publisher-2";
    },
    "wrong durable session": (f) => {
      f.session.id = "psc-other";
    },
    "wrong role": (f) => {
      f.step.metadata["gc.ralph_step_id"] = "review";
    },
    "wrong route": (f) => {
      f.step.metadata["gc.routed_to"] = "personal-site/skills.worker";
    },
    "wrong session name": (f) => {
      f.session.metadata.session_name = "skills__publisher-psc-other";
    },
    "wrong target": (f) => {
      f.step.metadata["gc.run_target"] = "skills.worker";
    },
    "wrong template": (f) => {
      f.session.metadata.template = "personal-site/skills.worker";
    },
  };

  await Promise.all(
    Object.entries(mutations).map(([name, mutate]) =>
      t.test(`rejects ${name}`, () => {
        const f = singletonFixture();
        mutate(f);
        assert.throws(() => resolveContext(f.env, f.read));
      })
    )
  );
});

test("canonical native names normalize independently from durable session IDs", (t) => {
  const f = recoveryFixture(t);
  f.rows["ps-subject"].assignee = "gc__worker-psc-worker";
  assert.equal(f.context().executor, "psc-worker");
  adoptPreparation(f.context());
  selectReceipt("prepared", 0, "absent", f.context());
  f.rows["ps-subject"].status = "closed";
  f.rows["ps-subject"].assignee = "";
  const context = resolveContext(f.env, f.read);
  assert.equal(context.executor, "psc-worker");
  assert.ok(context.ownerIdentities.includes("gc__worker-psc-worker"));
  assert.doesNotThrow(() => checkStage("prepared", context));
  delete f.rows["ps-subject"].metadata["gc.session_name"];
  assert.throws(() => resolveContext(f.env, f.read), /identity missing/u);
});

test("review cannot evade independence through original or adopter canonical aliases", (t) => {
  for (const reviewer of ["psc-original", "psc-worker"]) {
    const f = preparedRecovery(t, (recovery) => {
      recovery.prepared.preparer = "gc__original-psc-original";
      save(
        path.join(recovery.directory, recovery.preparedPath),
        recovery.prepared
      );
      recovery.authorization.originalPreparer = recovery.prepared.preparer;
      recovery.authorization.prepared.sha256 = bytesHash(
        readFileSync(path.join(recovery.directory, recovery.preparedPath))
      );
      recovery.authorization.adopter = "gc__worker-psc-worker";
    });

    switchSubject(f, "ps-aliasreview", "review", reviewer);

    const canonical =
      reviewer === "psc-original"
        ? "gc__original-psc-original"
        : "gc__worker-psc-worker";

    f.rows["ps-aliasreview"].metadata["gc.session_name"] = canonical;
    f.env.GC_SESSION_NAME = canonical;
    const context = resolveWriteContext(f.env, f.read, () => "ps-aliasreview");
    recordStage(
      "reviewed",
      0,
      {
        commit: f.commit,
        evidence: ["Synthetic alias independence rejection"],
        reviewer,
        tree: f.tree,
        verdict: "pass",
      },
      context
    );
    assert.throws(
      () => selectReceipt("reviewed", 0, "absent", context),
      /cannot independently review/u
    );
  }
});

test("singleton actor preserves durable receipt identity and reviewer independence", (t) => {
  for (const reviewer of ["psc-original", "psc-worker", "psc-reviewer"]) {
    const f = preparedRecovery(t);
    switchSubject(f, "ps-singletonreview", "review", reviewer);
    const step = f.rows["ps-singletonreview"];

    const name = {
      "psc-original": "gc__original-psc-original",
      "psc-reviewer": "gc__role-psc-reviewer",
      "psc-worker": "gc__worker-psc-worker",
    }[reviewer];

    step.assignee = "personal-site/skills.reviewer";
    step.started_at = "2026-11-04T21:26:38Z";
    step.lease_expires_at = "2999-01-01T00:00:00Z";
    Object.assign(step.metadata, {
      "gc.claimed_at": "2026-11-04T21:26:39Z",
      "gc.routed_to": step.assignee,
      "gc.run_target": "skills.reviewer",
      "gc.session_name": name,
    });
    f.rows[reviewer] = {
      id: reviewer,
      issue_type: "session",
      metadata: {
        alias: step.assignee,
        canonical_instance_name: step.assignee,
        current_claim_bead_id: step.id,
        session_name: name,
        state: "active",
        template: step.assignee,
      },
      status: "open",
    };
    f.env.BEADS_ACTOR = step.assignee;
    f.env.GC_SESSION_NAME = name;
    const context = resolveWriteContext(f.env, f.read, () => step.id);
    recordStage(
      "reviewed",
      0,
      {
        candidate: f.request.candidate,
        commit: f.commit,
        evidence: ["Synthetic singleton independence"],
        reviewer,
        tree: f.tree,
        verdict: "pass",
      },
      context
    );

    if (reviewer === "psc-reviewer") {
      selectReceipt("reviewed", 0, "absent", context);
      assert.equal(
        checkStage("reviewed", resolveContext(f.env, f.read)).commit,
        f.commit
      );
      assert.equal(
        JSON.parse(
          readFileSync(path.join(context.receiptDirectory, "reviewed.json"))
        ).reviewer,
        reviewer
      );
    } else {
      assert.throws(
        () => selectReceipt("reviewed", 0, "absent", context),
        /Independent review evidence missing|cannot independently review/u
      );
    }
  }
});

test("loss of a live claim during preparation cannot create adoption evidence", (t) => {
  const f = recoveryFixture(t);
  const context = f.context();
  f.rows["ps-subject"].status = "closed";
  f.rows["ps-subject"].assignee = "";
  assert.throws(() => adoptPreparation(context), /live claim/u);
  assert.equal(
    existsSync(path.join(f.directory, "attempts/ps-root/adoption.json")),
    false
  );
});

test("schema-2 authorization failures retain durable raw check evidence", (t) => {
  const f = recoveryFixture(t);
  f.rows["ps-root"].metadata.skill_recovery_authorization_sha256 = "a".repeat(
    64
  );
  const archive = beginCheckArchive("prepared", f.env, f.read);
  writeFileSync(path.join(archive, "stdout.log"), "");
  writeFileSync(path.join(archive, "stderr.log"), "authorization rejected");
  writeFileSync(path.join(archive, "exit.json"), '{"exitCode":1}');
  const manifest = finishCheckArchive("prepared", 1, f.env, f.read);
  assert.match(manifest.receiptContextError, /digest/u);
  assert.equal(manifest.exitCode, 1);
  assert.equal(manifest.complete, true);
});

test("a new root retains the authorized candidate lineage limit and unknown counts hold", (t) => {
  const f = recoveryFixture(t);
  mkdirSync(path.join(f.directory, "history"));

  for (const attempt of [1, 2, 3]) {
    const relative = `history/${attempt}.json`;
    save(path.join(f.directory, relative), {
      attempt,
      candidate: f.request.candidate,
      complete: true,
    });
    f.authorization.landingHistory.push({
      attempt,
      manifest: {
        path: relative,
        sha256: bytesHash(readFileSync(path.join(f.directory, relative))),
      },
    });
  }

  f.authorize();
  adoptPreparation(f.context());

  const context = switchSubject(
    f,
    "ps-budgetpublish",
    "publish",
    "psc-publisher"
  );

  assert.throws(
    () => recordStage("integrated", 1, {}, context),
    /count reset/u
  );
  assert.throws(() => recordStage("integrated", 4, {}, context), /limit/u);
  delete f.authorization.lineageComplete;
  f.authorize();
  assert.throws(
    () => resolveReceiptContext(f.env, f.read),
    /authorization schema/u
  );
});

test("contradictory canonical names under distinct durable session IDs hold review", (t) => {
  const f = preparedRecovery(t);

  let context = switchSubject(
    f,
    "ps-ambiguousreview",
    "review",
    "psc-reviewer"
  );

  f.rows["ps-ambiguousreview"].metadata["gc.session_name"] =
    "gc__original-psc-original";
  f.env.GC_SESSION_NAME = "gc__original-psc-original";
  context = resolveWriteContext(f.env, f.read, () => "ps-ambiguousreview");
  recordStage(
    "reviewed",
    0,
    {
      commit: f.commit,
      evidence: ["Synthetic contradictory canonical name"],
      reviewer: "psc-reviewer",
      tree: f.tree,
      verdict: "pass",
    },
    context
  );
  assert.throws(
    () => selectReceipt("reviewed", 0, "absent", context),
    /ambiguous/u
  );
});

test("foreign schema-2 pointers remain opaque archivable preflight failures", (t) => {
  const f = recoveryFixture(t);
  adoptPreparation(f.context());
  const pointer = selectReceipt("prepared", 0, "absent", f.context());
  save(path.join(f.artifacts, "result.json"), {
    ...pointer,
    root: "ps-foreign",
  });
  const archive = beginCheckArchive("prepared", f.env, f.read);
  writeFileSync(path.join(archive, "stdout.log"), "");
  writeFileSync(path.join(archive, "stderr.log"), "foreign selector rejected");
  writeFileSync(path.join(archive, "exit.json"), '{"exitCode":1}');
  assert.equal(finishCheckArchive("prepared", 1, f.env, f.read).exitCode, 1);
  assert.equal(
    JSON.parse(readFileSync(path.join(archive, "before/native/result.json")))
      .root,
    "ps-foreign"
  );
});

const customization = () => ({
  installedHash: "c".repeat(64),
  upstreamHash: "d".repeat(64),
  upstreamRevision: "b".repeat(40),
});

test("scanner admission holds marked installed bytes even when computedHash matches", (t) => {
  const f = fixture(t, (lock) => {
    lock.skills.demo.customization = customization();
    lock.skills.demo.customization.installedHash =
      lock.skills.demo.computedHash;
  });

  git(f.checkout, "checkout", "--detach", f.base);
  assert.equal(
    hashDirectory(path.join(f.checkout, ".agents/skills/demo")),
    f.request.currentHash
  );

  const prompt = readFileSync(
    new URL(
      "../gascity/skill-updates/agents/scanner/prompt.template.md",
      import.meta.url
    ),
    "utf-8"
  );

  assert.match(prompt, /node scripts\/skill-update\.mjs scan-admission/u);
  assert.throws(
    () => main(["scan-admission", f.checkout, "demo"]),
    /customization.*review/u
  );
});

test("trusted prepared validation rejects marked baselines independently of scanner", (t) => {
  for (const marker of [
    customization(),
    null,
    false,
    "",
    {},
    { upstreamRevision: "bad" },
  ]) {
    const f = fixture(t, (lock) => {
      lock.skills.demo.customization = marker;
    });

    assert.throws(
      () =>
        validateCommit(
          f.request,
          f.checkout,
          f.base,
          f.commit,
          f.sourceCheckout
        ),
      /customization.*review/u
    );
    git(f.checkout, "checkout", "--detach", f.base);
    assert.throws(
      () => main(["scan-admission", f.checkout, "demo"]),
      /customization.*review/u
    );
  }
});

test("ordinary updates preserve unrelated markers and lock fields", (t) => {
  const f = fixture(t, (lock) => {
    lock.skills.other.customization = customization();
    lock.skills.demo.extra = { keep: true };
    lock.extra = { keep: [1, 2] };
  });

  assert.match(
    validateCommit(f.request, f.checkout, f.base, f.commit, f.sourceCheckout),
    /^[a-f0-9]{40}$/u
  );
  assert.equal(
    main(["scan-admission", f.checkout, "demo"]),
    f.request.targetHash
  );

  const before = JSON.parse(
    git(f.checkout, "show", `${f.base}:skills-lock.json`)
  );

  const after = JSON.parse(
    readFileSync(path.join(f.checkout, "skills-lock.json"), "utf-8")
  );

  before.skills.demo.computedHash = f.request.targetHash;
  assert.deepEqual(after, before);
  delete f.lock.skills.other.customization;
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
    /Unrelated lock mutation/u
  );
});

const scanEvidenceFixture = (t) => {
  const directory = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "skill-scan-evidence-"))
  );

  t.after(() => rmSync(directory, { force: true, recursive: true }));
  const checkout = path.join(directory, "scan");
  const repository = path.join(directory, "upstream", "repository");
  const materializedDirectory = path.join(directory, "upstream", "demo");
  const sourceDirectory = path.join(repository, "skills", "demo");
  const installedDirectory = path.join(checkout, ".agents", "skills", "demo");
  const localDirectory = path.join(checkout, ".agents", "skills", "editorial");

  const sourceFiles = {
    "-notes.md": "punctuation member\n",
    "A-upper.md": "uppercase member\n",
    "SKILL.md": "distinct pinned upstream skill\n",
    "_notes.md": "underscore member\n",
    "a-lower.md": "lowercase member\n",
  };

  for (const location of [
    checkout,
    repository,
    sourceDirectory,
    materializedDirectory,
    installedDirectory,
    localDirectory,
  ]) {
    mkdirSync(location, { recursive: true });
  }

  for (const location of [checkout, repository]) {
    git(location, "init", "-q");
  }

  git(
    repository,
    "remote",
    "add",
    "origin",
    "https://github.com/owner/repo.git"
  );

  for (const [name, bytes] of Object.entries(sourceFiles)) {
    writeFileSync(path.join(sourceDirectory, name), bytes, { mode: 0o644 });
    writeFileSync(path.join(materializedDirectory, name), bytes, {
      mode: 0o644,
    });
    writeFileSync(path.join(installedDirectory, name), bytes, { mode: 0o644 });
  }

  writeFileSync(path.join(installedDirectory, "SKILL.md"), "installed skill\n");
  writeFileSync(path.join(localDirectory, "SKILL.md"), "local-only skill\n", {
    mode: 0o644,
  });
  writeFileSync(path.join(localDirectory, "notes.md"), "local-only notes\n", {
    mode: 0o644,
  });

  const targetRevision = commit(repository, "pinned source");
  save(path.join(checkout, "skills-lock.json"), {
    skills: {
      demo: {
        computedHash: hashDirectory(installedDirectory),
        skillPath: "skills/demo/SKILL.md",
        source: "owner/repo",
        sourceType: "github",
      },
    },
    version: 1,
  });
  const scanBase = commit(checkout, "installed scan base");

  const sources = [
    {
      materializedDirectory,
      repository,
      revision: targetRevision,
      skill: "demo",
      skillPath: "skills/demo/SKILL.md",
    },
  ];

  const evidence = () =>
    collectScanEvidence(checkout, scanBase, sources, directory);

  const context = {
    directory,
    executor: "psc-scanner",
    root: { id: "ps-root" },
    subject: {
      assignee: "personal-site/skills.scanner",
      id: "ps-scan",
      metadata: {
        "gc.root_bead_id": "ps-root",
        "gc.session_id": "psc-scanner",
      },
    },
  };

  const retainedPath = path.join(directory, "scan-evidence.json");

  const report = (value) => {
    save(retainedPath, value);

    return {
      retainedManifest: {
        path: retainedPath,
        sha256: createHash("sha256")
          .update(readFileSync(retainedPath))
          .digest("hex"),
      },
      scan: {
        assignee: context.subject.assignee,
        checkout,
        registeredCheckout: checkout,
        registeredRevision: scanBase,
        root: context.root.id,
        scanBase,
        session: context.executor,
        step: context.subject.id,
        validatedRemoteRevision: scanBase,
      },
      schema: "gc.skill-scan-report.v2",
      state: "complete",
    };
  };

  return {
    checkout,
    context,
    directory,
    evidence,
    materializedDirectory,
    report,
    repository,
    retainedPath,
    scanBase,
    sourceDirectory,
    sourceFiles,
    sources,
    targetRevision,
  };
};

test("scan evidence: distinct pinned source and every local-only file validate", (t) => {
  const f = scanEvidenceFixture(t);
  const evidence = f.evidence();
  const source = evidence.sources.find((entry) => entry.skill === "demo");
  const installed = evidence.installed.find((entry) => entry.skill === "demo");
  const local = evidence.installed.find((entry) => entry.skill === "editorial");

  assert.equal(evidence.schema, "skill-scan-evidence.v1");
  assert.equal(evidence.sources.length, 1);
  assert.equal(evidence.installed.length, 2);
  assert.notEqual(source.hash, installed.hash);
  assert.equal(
    source.members.find((member) => member.path === "SKILL.md").gitBlob,
    git(f.repository, "rev-parse", `${f.targetRevision}:skills/demo/SKILL.md`)
  );
  assert.equal(local.localOnly, true);
  assert.deepEqual(local.members.map((member) => member.path).toSorted(), [
    "SKILL.md",
    "notes.md",
  ]);
  assert.doesNotThrow(() => validateScanEvidence(evidence, f.directory));
  assert.doesNotThrow(() =>
    validateScanReport(f.report(evidence), f.context, f.scanBase)
  );
});

test("scan evidence: copied installed members cannot represent differing pinned source", (t) => {
  const f = scanEvidenceFixture(t);
  const evidence = f.evidence();
  const installed = evidence.installed.find((entry) => entry.skill === "demo");
  const source = evidence.sources.find((entry) => entry.skill === "demo");

  assert.notDeepEqual(source.members, installed.members);
  source.members = structuredClone(installed.members);
  source.hash = installed.hash;

  assert.throws(() => validateScanEvidence(evidence, f.directory));
});

test("scan evidence: bytewise caller sorting cannot replace canonical localeCompare hash", (t) => {
  const f = scanEvidenceFixture(t);
  const evidence = f.evidence();
  const hash = createHash("sha256");

  for (const name of Object.keys(f.sourceFiles).toSorted((first, second) =>
    Buffer.compare(Buffer.from(first), Buffer.from(second))
  )) {
    hash.update(name);
    hash.update(readFileSync(path.join(f.materializedDirectory, name)));
  }

  const wrongHash = hash.digest("hex");
  const source = evidence.sources.find((entry) => entry.skill === "demo");
  assert.equal(source.hash, hashDirectory(f.materializedDirectory));
  assert.notEqual(wrongHash, source.hash);
  source.hash = wrongHash;

  assert.throws(() => validateScanEvidence(evidence, f.directory));
});

test("scan evidence: retained draft digest and canonical selfbinding are rejected", (t) => {
  const f = scanEvidenceFixture(t);
  const evidence = f.evidence();
  const report = f.report(evidence);

  const draftDigest = createHash("sha256")
    .update("draft bytes\n")
    .digest("hex");

  assert.notEqual(report.retainedManifest.sha256, draftDigest);
  assert.throws(() =>
    validateScanReport(
      {
        ...report,
        retainedManifest: { ...report.retainedManifest, sha256: draftDigest },
      },
      f.context,
      f.scanBase
    )
  );

  const canonical = path.join(f.directory, "scan-report.json");

  const selfBound = {
    ...report,
    retainedManifest: { path: canonical, sha256: draftDigest },
  };

  save(canonical, selfBound);

  assert.throws(() => validateScanReport(selfBound, f.context, f.scanBase));
});

test("scan evidence: omission of local-only tracked files or entire trees is rejected", (t) => {
  const f = scanEvidenceFixture(t);
  const evidence = f.evidence();
  const local = evidence.installed.find((entry) => entry.skill === "editorial");

  assert.equal(local.members.length, 2);
  local.members = local.members.filter((member) => member.path !== "notes.md");
  assert.throws(() => validateScanEvidence(evidence, f.directory));

  const omitted = f.evidence();
  omitted.installed = omitted.installed.filter(
    (entry) => entry.skill !== "editorial"
  );
  assert.throws(() => validateScanEvidence(omitted, f.directory));
});

test("scan evidence: executable source exports and escaped materialization refuse", (t) => {
  const f = scanEvidenceFixture(t);
  const file = path.join(f.materializedDirectory, "SKILL.md");

  assert.doesNotThrow(() => f.evidence());
  chmodSync(file, 0o755);
  assert.throws(() => f.evidence());
  chmodSync(file, 0o644);

  const outside = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "skill-scan-escape-"))
  );

  t.after(() => rmSync(outside, { force: true, recursive: true }));

  for (const [name, bytes] of Object.entries(f.sourceFiles)) {
    writeFileSync(path.join(outside, name), bytes, { mode: 0o644 });
  }

  assert.throws(() =>
    collectScanEvidence(
      f.checkout,
      f.scanBase,
      [{ ...f.sources[0], materializedDirectory: outside }],
      f.directory
    )
  );
});

test("scan evidence: postclosure native check archives without worker identity or item receipts", (t) => {
  const city = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "skill-scan-archive-"))
  );

  t.after(() => rmSync(city, { force: true, recursive: true }));
  const directory = path.join(city, ".gc", "skill-updates", "ps-scan");
  const molecule = path.join(city, ".gc", "molecules", "ps-root");
  const artifacts = path.join(molecule, "artifacts", "ps-scan");
  mkdirSync(directory, { recursive: true });
  mkdirSync(artifacts, { recursive: true });
  save(path.join(directory, "scan-report.json"), { report: "retained final" });
  save(path.join(directory, "scan-evidence.json"), {
    evidence: "retained members",
  });

  const actor = "personal-site/skills.scanner";

  const rows = {
    "ps-root": {
      id: "ps-root",
      metadata: { "gc.formula_name": "scan-skills", "gc.kind": "workflow" },
      status: "in_progress",
    },
    "ps-scan": {
      assignee: actor,
      closed_at: "2026-11-08T18:00:10Z",
      id: "ps-scan",
      metadata: {
        "gc.claimed_at": "2026-11-08T18:00:00Z",
        "gc.iteration": "1",
        "gc.outcome": "pass",
        "gc.ralph_step_id": "scan",
        "gc.root_bead_id": "ps-root",
        "gc.routed_to": actor,
        "gc.run_target": "skills.scanner",
        "gc.session_id": "psc-session",
        "gc.session_name": "gc__skills-session",
      },
      started_at: "2026-11-08T18:00:00Z",
      status: "closed",
    },
    "psc-session": {
      id: "psc-session",
      issue_type: "session",
      metadata: {
        agent_name: actor,
        alias: actor,
        canonical_instance_name: actor,
        current_claim_bead_id: "ps-different",
        session_name: "gc__skills-session",
        state: "active",
        template: actor,
      },
      status: "open",
    },
  };

  const env = {
    GC_ARTIFACT_DIR: artifacts,
    GC_BEAD_ID: "ps-scan",
    GC_CITY: city,
    GC_ITERATION: "1",
    GC_MOLECULE_DIR: molecule,
  };

  const read = (id) => rows[id];
  assert.equal(env.GC_SESSION_ID, undefined);
  assert.equal(env.GC_INSTANCE_TOKEN, undefined);
  assert.equal(env.BEADS_ACTOR, undefined);

  rows["ps-root"].metadata["gc.formula_name"] = "update-skill";
  assert.throws(() => beginCheckArchive("scanned", env, read));
  rows["ps-root"].metadata["gc.formula_name"] = "scan-skills";
  rows["psc-session"].metadata.agent_name = "personal-site/skills.worker";
  assert.throws(() => beginCheckArchive("scanned", env, read));
  rows["psc-session"].metadata.agent_name = actor;
  rows["ps-scan"].metadata["gc.run_target"] = "skills.worker";
  assert.throws(() => beginCheckArchive("scanned", env, read));
  rows["ps-scan"].metadata["gc.run_target"] = "skills.scanner";

  const archive = beginCheckArchive("scanned", env, read);
  writeFileSync(
    path.join(archive, "stdout.log"),
    "scan gate retained output\n"
  );
  writeFileSync(path.join(archive, "stderr.log"), "");
  save(path.join(archive, "exit.json"), { exitCode: 0 });
  const manifest = finishCheckArchive("scanned", 0, env, read);

  assert.equal(manifest.stage, "scanned");
  assert.equal(manifest.subject, "ps-scan");
  assert.equal(manifest.root, "ps-root");
  assert.equal(manifest.executorSessionId, "psc-session");
  assert.equal(manifest.exitCode, 0);
  assert.equal(manifest.complete, true);
  assert.equal(existsSync(path.join(archive, "candidate.json")), false);
  assert.equal(existsSync(path.join(archive, "convoy.json")), false);
  assert.ok(manifest.hashes["before/receipts/scan-report.json"]);
  assert.ok(manifest.hashes["after/receipts/scan-evidence.json"]);
  assert.equal(
    readFileSync(path.join(archive, "sealed", "stdout.log"), "utf-8"),
    "scan gate retained output\n"
  );
  rmSync(molecule, { force: true, recursive: true });
  assert.equal(
    readFileSync(
      path.join(archive, "after", "receipts", "scan-report.json"),
      "utf-8"
    ),
    readFileSync(path.join(directory, "scan-report.json"), "utf-8")
  );
});

test("scan evidence R2: invalid schema, native identity and external checkout cause zero Git calls", (t) => {
  const f = scanEvidenceFixture(t);
  const report = f.report(f.evidence());
  const bin = path.join(f.directory, "git-spy-bin");
  const log = path.join(f.directory, "git-spy.log");
  const input = path.join(f.directory, "git-spy-input.json");
  mkdirSync(bin);
  writeFileSync(log, "");
  writeFileSync(
    path.join(bin, "git"),
    '#!/bin/sh\nprintf "%s\\n" "$@" >> "$SCAN_GIT_LOG"\nexit 1\n',
    { mode: 0o700 }
  );
  save(input, { context: f.context, freshBase: f.scanBase, report });
  const helper = new URL("skill-update.mjs", import.meta.url).href;

  const program = `
    import assert from "node:assert/strict";
    import { readFileSync } from "node:fs";
    import { spawnSync } from "node:child_process";
    import { validateScanReport } from ${JSON.stringify(helper)};
    const { report, context, freshBase } = JSON.parse(readFileSync(process.env.SCAN_SPY_INPUT, "utf-8"));
    const freshReader = (checkout) => {
      spawnSync("git", ["fresh-reader", checkout], { env: process.env });
      return freshBase;
    };
    const invalid = [
      { ...report, schema: "foreign-report" },
      { ...report, scan: { ...report.scan, step: "ps-foreign" } },
      { ...report, scan: { ...report.scan, checkout: ${JSON.stringify(path.dirname(f.directory))} } }
    ];
    for (const value of invalid) {
      assert.throws(() => validateScanReport(value, context, freshReader));
    }
  `;

  const child = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", program],
    {
      cwd: f.directory,
      encoding: "utf-8",
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        SCAN_GIT_LOG: log,
        SCAN_SPY_INPUT: input,
      },
      timeout: 15_000,
    }
  );

  assert.equal(child.status, 0, child.stderr);
  assert.equal(readFileSync(log, "utf-8"), "");
});

test("scan evidence R2: raw dot segments and installed materialization aliases refuse", (t) => {
  const f = scanEvidenceFixture(t);
  assert.doesNotThrow(() => f.evidence());

  assert.throws(() =>
    collectScanEvidence(
      `${f.checkout}/../scan`,
      f.scanBase,
      f.sources,
      f.directory
    )
  );
  assert.throws(() =>
    collectScanEvidence(
      f.checkout,
      f.scanBase,
      [{ ...f.sources[0], repository: `${f.repository}/../repository` }],
      f.directory
    )
  );
  assert.throws(() =>
    collectScanEvidence(
      f.checkout,
      f.scanBase,
      [
        {
          ...f.sources[0],
          materializedDirectory: `${f.materializedDirectory}/../demo`,
        },
      ],
      f.directory
    )
  );

  const installed = path.join(f.checkout, ".agents", "skills", "demo");
  writeFileSync(
    path.join(f.sourceDirectory, "SKILL.md"),
    readFileSync(path.join(installed, "SKILL.md"))
  );
  const matchingRevision = commit(f.repository, "matching installed bytes");
  assert.equal(hashDirectory(f.sourceDirectory), hashDirectory(installed));

  assert.throws(() =>
    collectScanEvidence(
      f.checkout,
      f.scanBase,
      [
        {
          ...f.sources[0],
          materializedDirectory: `${f.directory}/upstream/../scan/.agents/skills/demo`,
          revision: matchingRevision,
        },
      ],
      f.directory
    )
  );
});

test("scan evidence R2: symlink ancestors of installed skills reject matching bytes", (t) => {
  for (const ancestor of [".agents", ".agents/skills"]) {
    const f = scanEvidenceFixture(t);
    const baseline = f.evidence();
    const installed = path.join(f.checkout, ".agents", "skills", "demo");
    const before = hashDirectory(installed);
    const original = path.join(f.checkout, ancestor);
    const moved = path.join(f.directory, "moved-installed-ancestor");
    renameSync(original, moved);
    symlinkSync(moved, original);

    assert.equal(hashDirectory(installed), before);
    assert.equal(
      baseline.installed.find((entry) => entry.skill === "demo").hash,
      before
    );
    assert.throws(() => f.evidence());
    assert.throws(() => validateScanEvidence(baseline, f.directory));
  }
});

test("scan evidence R2: final remote revision is explicit and fresh scoped readback remains separate", (t) => {
  const f = scanEvidenceFixture(t);
  const report = f.report(f.evidence());
  assert.equal(report.scan.validatedRemoteRevision, f.scanBase);
  const canonical = path.join(f.directory, "scan-report.json");
  save(canonical, report);
  const canonicalBytes = readFileSync(canonical);

  writeFileSync(
    path.join(f.checkout, "unrelated.md"),
    "unrelated remote change\n"
  );
  const freshUnrelated = commit(f.checkout, "unrelated successor");
  git(f.checkout, "checkout", "--detach", f.scanBase);
  let reads = 0;

  const actual = validateScanReport(report, f.context, (checkout) => {
    reads += 1;
    assert.equal(checkout, f.checkout);

    return freshUnrelated;
  });

  assert.equal(reads, 1);
  assert.equal(actual.validatedRemoteRevision, freshUnrelated);
  assert.equal(actual.report.scan.validatedRemoteRevision, f.scanBase);
  assert.deepEqual(readFileSync(canonical), canonicalBytes);

  for (const bound of [false, true]) {
    const draft = structuredClone(report);

    if (!bound) {
      delete draft.scan.validatedRemoteRevision;
      draft.details = { validatedRemoteRevision: freshUnrelated };
      assert.throws(() => validateScanReport(draft, f.context, freshUnrelated));
    }

    const finalized = validateScanReport(
      draft,
      f.context,
      freshUnrelated,
      true
    );

    assert.equal(finalized.validatedRemoteRevision, freshUnrelated);
    assert.equal(finalized.report.scan.validatedRemoteRevision, freshUnrelated);
  }

  writeFileSync(
    path.join(f.checkout, ".agents", "skills", "demo", "SKILL.md"),
    "relevant remote change\n"
  );
  const freshRelevant = commit(f.checkout, "changed remote skill");
  git(f.checkout, "checkout", "--detach", f.scanBase);
  assert.throws(() => validateScanReport(report, f.context, freshRelevant));
  assert.throws(() =>
    validateScanReport(
      {
        ...report,
        scan: { ...report.scan, validatedRemoteRevision: freshRelevant },
      },
      f.context,
      freshUnrelated
    )
  );
  assert.deepEqual(readFileSync(canonical), canonicalBytes);
});

const scanGitBoundaryProbe = (f, report, mode, redirects = {}) => {
  const probe = mkdtempSync(path.join(f.directory, "git-boundary-"));
  const bin = path.join(probe, "bin");
  const log = path.join(probe, "git.log");
  const input = path.join(probe, "input.json");
  mkdirSync(bin);
  writeFileSync(log, "");
  writeFileSync(
    path.join(bin, "git"),
    `#!/bin/sh\nprintf "%s\\t%s\\t%s\\t%s\\n" "$PWD" "$*" "\${GIT_CONFIG_COUNT-unset}" "\${GIT_NO_REPLACE_OBJECTS-unset}" >> "$SCAN_GIT_LOG"\nif [ "$1" = fresh-reader ]; then exit 1; fi\nif [ "$SCAN_LOCAL_GIT" = 1 ]; then exec /usr/bin/git "$@"; fi\nexit 1\n`,
    { mode: 0o700 }
  );
  save(input, { context: f.context, freshBase: f.scanBase, mode, report });
  const helper = new URL("skill-update.mjs", import.meta.url).href;

  const program = `
    import assert from "node:assert/strict";
    import { readFileSync } from "node:fs";
    import { spawnSync } from "node:child_process";
    import { validateScanReport } from ${JSON.stringify(helper)};
    const { report, context, freshBase, mode } = JSON.parse(readFileSync(process.env.SCAN_BOUNDARY_INPUT, "utf-8"));
    const freshReader = (checkout) => {
      spawnSync("git", ["fresh-reader", checkout], { env: process.env });
      return freshBase;
    };
    if (mode === "valid") {
      assert.equal(validateScanReport(report, context, freshReader).validatedRemoteRevision, freshBase);
    } else {
      assert.throws(() => validateScanReport(report, context, freshReader));
    }
  `;

  const child = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", program],
    {
      cwd: f.directory,
      encoding: "utf-8",
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        SCAN_BOUNDARY_INPUT: input,
        SCAN_GIT_LOG: log,
        SCAN_LOCAL_GIT: "1",
        ...redirects,
      },
      timeout: 15_000,
    }
  );

  assert.equal(child.status, 0, child.stderr);

  return readFileSync(log, "utf-8").split("\n").filter(Boolean);
};

test("scan evidence R3: inherited Git routing refuses before any Git or fresh callback", (t) => {
  const f = scanEvidenceFixture(t);
  const report = f.report(f.evidence());

  const redirects = {
    GIT_ALTERNATE_OBJECT_DIRECTORIES: path.join(
      f.directory,
      "foreign-alternates"
    ),
    GIT_COMMON_DIR: path.join(f.directory, "foreign-common"),
    GIT_CONFIG: path.join(f.directory, "foreign-config"),
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_GLOBAL: path.join(f.directory, "foreign-global-config"),
    GIT_CONFIG_KEY_0: "core.worktree",
    GIT_CONFIG_PARAMETERS: "'core.bare'='true'",
    GIT_CONFIG_SYSTEM: path.join(f.directory, "foreign-system-config"),
    GIT_CONFIG_VALUE_0: path.join(f.directory, "foreign-worktree"),
    GIT_DIR: path.join(f.directory, "foreign-git"),
    GIT_OBJECT_DIRECTORY: path.join(f.directory, "foreign-objects"),
    GIT_WORK_TREE: path.join(f.directory, "foreign-worktree"),
  };

  for (const [name, value] of Object.entries(redirects)) {
    assert.deepEqual(
      scanGitBoundaryProbe(f, report, "refuse", { [name]: value }),
      []
    );
  }
});

test("scan evidence R3: external checkout Git pointer or symlink refuses before Git", (t) => {
  for (const kind of ["pointer", "symlink"]) {
    const f = scanEvidenceFixture(t);
    const report = f.report(f.evidence());
    const control = path.join(f.checkout, ".git");
    const external = path.join(f.directory, "external-checkout-git");
    renameSync(control, external);

    if (kind === "pointer") {
      writeFileSync(control, `gitdir: ${external}\n`);
    } else {
      symlinkSync(external, control);
    }

    assert.deepEqual(scanGitBoundaryProbe(f, report, "refuse"), []);
  }
});

test("scan evidence R3: source Git storage, object aliases and config inclusion refuse before fresh lookup", (t) => {
  for (const kind of [
    "pointer",
    "alternates",
    "objects-symlink",
    "commondir",
    "config-include",
    "object-hardlink",
  ]) {
    const f = scanEvidenceFixture(t);
    const report = f.report(f.evidence());
    const control = path.join(f.repository, ".git");

    if (kind === "pointer") {
      const external = path.join(f.directory, "external-source-git");
      renameSync(control, external);
      writeFileSync(control, `gitdir: ${external}\n`);
    } else if (kind === "alternates") {
      writeFileSync(
        path.join(control, "objects", "info", "alternates"),
        `${path.join(f.checkout, ".git", "objects")}\n`
      );
    } else if (kind === "objects-symlink") {
      const external = path.join(f.directory, "external-source-objects");
      renameSync(path.join(control, "objects"), external);
      symlinkSync(external, path.join(control, "objects"));
    } else if (kind === "commondir") {
      writeFileSync(path.join(control, "commondir"), "../../external-common\n");
    } else if (kind === "config-include") {
      const included = path.join(f.directory, "included-config");
      writeFileSync(included, "[core]\n\tbare = false\n");
      const config = path.join(control, "config");
      writeFileSync(
        config,
        `${readFileSync(config, "utf-8")}\n[include]\n\tpath = ${included}\n`
      );
    } else {
      const blob = git(
        f.repository,
        "rev-parse",
        `${f.targetRevision}:skills/demo/SKILL.md`
      );

      linkSync(
        path.join(control, "objects", blob.slice(0, 2), blob.slice(2)),
        path.join(f.directory, "shared-source-object")
      );
    }

    const calls = scanGitBoundaryProbe(f, report, "refuse");
    assert.equal(
      calls.some((line) => line.includes("fresh-reader")),
      false
    );
    assert.equal(
      calls.some((line) => /\tfetch(?: |\t)/u.test(line)),
      false
    );
  }
});

test("scan evidence R3: ordinary owned Git remains unchanged with one explicit child environment", (t) => {
  const f = scanEvidenceFixture(t);
  const report = f.report(f.evidence());

  const controls = [
    path.join(f.checkout, ".git", "HEAD"),
    path.join(f.checkout, ".git", "config"),
    path.join(f.repository, ".git", "HEAD"),
    path.join(f.repository, ".git", "config"),
  ];

  const before = controls.map((file) => readFileSync(file));
  const calls = scanGitBoundaryProbe(f, report, "valid");
  const reads = calls.filter((line) => !line.includes("fresh-reader"));
  assert.equal(calls.filter((line) => line.includes("fresh-reader")).length, 1);
  assert.ok(reads.length > 0);
  assert.ok(reads.some((line) => line.includes("cat-file blob")));

  for (const line of reads) {
    const fields = line.split("\t");
    assert.equal(fields[2], "0");
    assert.equal(fields[3], "1");
  }

  for (const [index, file] of controls.entries()) {
    assert.deepEqual(readFileSync(file), before[index]);
  }
});

test("scan evidence R4: worktree config storage and extensions refuse before their repository Git", (t) => {
  for (const owner of ["checkout", "source"]) {
    for (const kind of ["worktree-file", "extension-without-file"]) {
      const f = scanEvidenceFixture(t);
      const report = f.report(f.evidence());
      const repository = owner === "checkout" ? f.checkout : f.repository;
      const control = path.join(repository, ".git");
      const worktreeConfig = path.join(control, "config.worktree");

      if (kind === "worktree-file") {
        const included = path.join(f.directory, "external-worktree-config");
        writeFileSync(included, "[core]\n\tbare = false\n");
        writeFileSync(worktreeConfig, `[include]\n\tpath = ${included}\n`);
      } else {
        const config = path.join(control, "config");
        writeFileSync(
          config,
          `${readFileSync(config, "utf-8")}\n[extensions]\n\tworktreeConfig = true\n`
        );
        assert.equal(existsSync(worktreeConfig), false);
      }

      const calls = scanGitBoundaryProbe(f, report, "refuse");

      if (owner === "checkout") {
        assert.deepEqual(calls, []);
      } else {
        assert.equal(
          calls.some((line) => line.includes(f.repository)),
          false
        );
        assert.equal(
          calls.some((line) => line.includes("fresh-reader")),
          false
        );
        assert.equal(
          calls.some((line) => /\tfetch(?: |\t)/u.test(line)),
          false
        );
      }
    }
  }
});
