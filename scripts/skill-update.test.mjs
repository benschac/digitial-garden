import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import {
  mkdtempSync,
  renameSync,
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
    const oldPublished = JSON.parse(readFileSync(pointerFile));
    oldPublished.attempt = 1;
    save(pointerFile, oldPublished);
    assert.throws(
      () => checkStage("published", resolveContext(f.env, f.read)),
      /current published/u
    );
  });
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
