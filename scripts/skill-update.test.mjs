import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  validateLandingBase,
  validateRemoteEntry,
  hashDirectory,
  validateRequest,
  validateCommit,
  checkStage,
} from "./skill-update.mjs";

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
