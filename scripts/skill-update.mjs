import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  copyFileSync,
  constants,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

import * as Schema from "effect/Schema";

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const json = (file) => JSON.parse(readFileSync(file, "utf-8"));
const revision = /^[a-f0-9]{40}$/u;
const digest = /^[a-f0-9]{64}$/u;
const identity = /^[a-z0-9]+-[a-z0-9]+$/u;
const nativeIdentity = Schema.String.check(Schema.isPattern(identity));

const integrationIdentity = Schema.Struct({
  candidate: nativeIdentity,
  commit: Schema.String.check(Schema.isPattern(revision)),
});

const safePath = (value) =>
  Boolean(value) &&
  value
    .split("/")
    .every(
      (part) =>
        /^[a-zA-Z0-9_.-]+$/u.test(part) &&
        ![".", "..", ".git", "node_modules"].includes(part)
    );

const command = (exe, args, cwd) => {
  const result = spawnSync(exe, args, {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, GIT_CONFIG_COUNT: "0", GIT_NO_REPLACE_OBJECTS: "1" },
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120_000,
  });

  ensure(
    !result.error && result.status === 0,
    `${exe} failed: ${result.error?.message ?? result.stderr}`
  );

  return result.stdout.trimEnd();
};

const git = (cwd, ...args) => command("git", args, cwd);

const allowedOrigin = (origin) =>
  [
    "git@github.com:benschac/digitial-garden.git",
    "https://github.com/benschac/digitial-garden.git",
    "https://github.com/benschac/digitial-garden",
  ].includes(origin);

const readObject = (cwd, ref, file) => git(cwd, "show", `${ref}:${file}`);

const hashFiles = (files) => {
  const hash = createHash("sha256");

  for (const [name, bytes] of files.toSorted(([a], [b]) =>
    a.localeCompare(b)
  )) {
    hash.update(name);
    hash.update(bytes);
  }

  return hash.digest("hex");
};

export const hashDirectory = (directory) => {
  const files = [];

  const walk = (current, prefix) => {
    ensure(
      lstatSync(current).isDirectory(),
      "Skill directory must not be a symlink"
    );

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if ([".git", "node_modules"].includes(entry.name)) {
        continue;
      }

      const location = path.join(current, entry.name);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      ensure(!entry.isSymbolicLink(), "Skill symlinks require review");

      if (entry.isDirectory()) {
        walk(location, relative);
      } else {
        ensure(entry.isFile(), "Unsupported skill file");
        files.push([relative, readFileSync(location)]);
      }
    }
  };

  walk(directory, "");

  return hashFiles(files);
};

export const validateRequest = (request) => {
  ensure(identity.test(request.candidate), "Invalid candidate");
  ensure(/^[a-z0-9][a-z0-9-]*$/u.test(request.skill), "Invalid skill name");
  ensure(
    /^[a-zA-Z0-9][a-zA-Z0-9_.-]*\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/u.test(
      request.source
    ),
    "Invalid GitHub source"
  );
  ensure(
    safePath(request.skillPath) && request.skillPath.endsWith("/SKILL.md"),
    "Unsafe skill source path"
  );
  ensure(
    revision.test(request.targetRevision) && revision.test(request.scanBase),
    "Expected pinned revisions"
  );
  ensure(
    digest.test(request.currentHash) &&
      digest.test(request.targetHash) &&
      request.currentHash !== request.targetHash,
    "Invalid content hashes"
  );

  return request;
};

const treeFiles = (cwd, ref, directory) => {
  ensure(revision.test(ref), "Invalid Git revision");

  const records = git(cwd, "ls-tree", "-r", "-z", ref, "--", `${directory}/`)
    .split("\0")
    .filter(Boolean);

  ensure(records.length > 0, "Missing skill tree");

  return records.map((record) => {
    const [header, file] = record.split("\t");
    const [mode, type, object] = header.split(" ");
    ensure(
      type === "blob" && mode === "100644",
      "Executable or symlink skill requires review"
    );
    ensure(
      file.startsWith(`${directory}/`) && safePath(file),
      "Unsafe tree path"
    );

    const result = spawnSync("git", ["cat-file", "blob", object], {
      cwd,
      maxBuffer: 32 * 1024 * 1024,
    });

    ensure(result.status === 0, "Cannot read skill blob");

    return [file.slice(directory.length + 1), result.stdout];
  });
};

const sameFiles = (first, second) =>
  isDeepStrictEqual(
    first.toSorted(([a], [b]) => a.localeCompare(b)),
    second.toSorted(([a], [b]) => a.localeCompare(b))
  );

export const validateCommit = (
  request,
  checkout,
  base,
  commit,
  sourceCheckout
) => {
  validateRequest(request);
  ensure(
    revision.test(base) && revision.test(commit),
    "Invalid commit identity"
  );
  ensure(
    git(checkout, "rev-list", "--parents", "-n", "1", commit) ===
      `${commit} ${base}`,
    "Expected exactly one commit above base"
  );
  ensure(
    git(checkout, "status", "--porcelain", "--untracked-files=all") === "",
    "Dirty isolated checkout"
  );
  ensure(
    git(checkout, "rev-parse", "HEAD") === commit,
    "Checkout does not match artifact"
  );
  const prefix = `.agents/skills/${request.skill}`;

  const paths = git(checkout, "diff", "--name-only", "-z", base, commit)
    .split("\0")
    .filter(Boolean);

  ensure(
    paths.includes("skills-lock.json") &&
      paths.some((file) => file.startsWith(`${prefix}/`)) &&
      paths.every(
        (file) => file === "skills-lock.json" || file.startsWith(`${prefix}/`)
      ),
    "Commit escapes one skill scope"
  );
  const before = JSON.parse(readObject(checkout, base, "skills-lock.json"));
  const after = JSON.parse(readObject(checkout, commit, "skills-lock.json"));
  const oldEntry = before.skills?.[request.skill];
  ensure(
    oldEntry?.source === request.source &&
      oldEntry.sourceType === "github" &&
      oldEntry.skillPath === request.skillPath &&
      oldEntry.computedHash === request.currentHash,
    "Baseline lock identity changed"
  );
  const expected = structuredClone(before);
  expected.skills[request.skill].computedHash = request.targetHash;
  ensure(isDeepStrictEqual(expected, after), "Unrelated lock mutation");
  ensure(
    hashFiles(treeFiles(checkout, base, prefix)) === request.currentHash,
    "Local skill modifications require review"
  );
  const updated = treeFiles(checkout, commit, prefix);
  ensure(
    hashFiles(updated) === request.targetHash,
    "Target content hash mismatch"
  );
  ensure(
    git(sourceCheckout, "rev-parse", "HEAD") === request.targetRevision &&
      git(sourceCheckout, "status", "--porcelain", "--untracked-files=all") ===
        "",
    "Source revision mismatch or dirty source"
  );
  const sourceOrigin = git(sourceCheckout, "remote", "get-url", "origin");
  ensure(
    [
      `https://github.com/${request.source}.git`,
      `https://github.com/${request.source}`,
      `git@github.com:${request.source}.git`,
    ].includes(sourceOrigin),
    "Source origin mismatch"
  );
  ensure(
    sameFiles(
      updated,
      treeFiles(
        sourceCheckout,
        request.targetRevision,
        path.posix.dirname(request.skillPath)
      )
    ),
    "Pinned source bytes mismatch"
  );
  git(checkout, "diff", "--check", base, commit);

  return git(checkout, "rev-parse", `${commit}^{tree}`);
};

const contained = (root, location) => {
  ensure(path.isAbsolute(location), "Expected absolute artifact path");
  const relative = path.relative(realpathSync(root), realpathSync(location));
  ensure(
    relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative),
    "Artifact path escapes candidate"
  );

  return location;
};

const recordsFrom = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value.beads) {
    return value.beads;
  }

  if (value.bead) {
    return [value.bead];
  }

  if (value.data) {
    return recordsFrom(value.data);
  }

  return [value];
};

const checkedDirectory = (root, location, create = false) => {
  ensure(
    path.isAbsolute(root) && path.isAbsolute(location),
    "Expected absolute path"
  );
  const relative = path.relative(root, location);
  ensure(
    relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative),
    "Archive path escapes owner"
  );
  let current = root;

  for (const component of ["", ...relative.split(path.sep).filter(Boolean)]) {
    current = component ? path.join(current, component) : current;

    if (create && !existsSync(current)) {
      try {
        mkdirSync(current, { mode: 0o700 });
      } catch (error) {
        if (error.code !== "EEXIST") {
          throw error;
        }
      }
    }

    const stat = lstatSync(current);
    ensure(
      stat.isDirectory() &&
        !stat.isSymbolicLink() &&
        stat.uid === process.getuid(),
      "Unsafe archive directory owner or symlink"
    );
  }

  return location;
};

const checkedFile = (directory, file) => {
  checkedDirectory(directory, path.dirname(file));
  const stat = lstatSync(file);
  ensure(
    stat.isFile() &&
      !stat.isSymbolicLink() &&
      stat.nlink === 1 &&
      stat.uid === process.getuid(),
    "Unsafe evidence file"
  );

  return file;
};

export const resolveNativeContext = (env, readBead) => {
  ensure(
    env.GC_CITY && env.GC_BEAD_ID && env.GC_ARTIFACT_DIR,
    "Missing native check context"
  );
  ensure(path.isAbsolute(env.GC_CITY), "Expected absolute city path");

  const read = (id) => {
    ensure(Schema.is(nativeIdentity)(id), "Invalid native bead identity");
    const bead = readBead(id);
    ensure(bead.id === id, "Native bead read identity mismatch");

    return bead;
  };

  const subject = read(env.GC_BEAD_ID);
  const root = read(subject.metadata?.["gc.root_bead_id"]);
  const convoy = read(root.metadata?.["gc.input_convoy_id"]);
  ensure(
    ["in_progress", "closed"].includes(subject.status),
    "Native subject is not claimed"
  );
  ensure(
    !env.GC_ROOT_BEAD_ID || env.GC_ROOT_BEAD_ID === root.id,
    "Native root environment mismatch"
  );
  ensure(
    root.metadata?.["gc.kind"] === "workflow" &&
      root.metadata?.["gc.formula_name"] === "update-skill",
    "Unexpected skill workflow root"
  );
  ensure(
    ["open", "in_progress"].includes(root.status),
    "Skill workflow is terminal"
  );
  ensure(
    subject.assignee?.trim() &&
      subject.metadata?.["gc.session_id"] === subject.assignee,
    "Native subject ownership mismatch"
  );
  ensure(
    convoy.metadata?.["gc.synthetic_kind"] === "drain-unit-convoy",
    "Expected native drain unit"
  );
  const candidate = convoy.metadata["gc.drain_member_id"];
  ensure(
    identity.test(candidate) && candidate !== convoy.id,
    "Invalid drain member"
  );

  if (root.metadata["gc.drain_member_id"]) {
    ensure(
      root.metadata["gc.drain_member_id"] === candidate,
      "Conflicting drain member"
    );
  }

  const anchor = read(candidate);
  const molecule = path.join(env.GC_CITY, ".gc", "molecules", root.id);
  const artifactDirectory = path.join(molecule, "artifacts", subject.id);
  ensure(
    env.GC_ARTIFACT_DIR === artifactDirectory &&
      (!env.GC_MOLECULE_DIR || env.GC_MOLECULE_DIR === molecule),
    "Native artifact path mismatch"
  );
  checkedDirectory(env.GC_CITY, artifactDirectory);
  const directory = path.join(env.GC_CITY, ".gc", "skill-updates", candidate);
  checkedDirectory(env.GC_CITY, directory);

  return {
    anchor,
    artifactDirectory,
    candidate,
    convoy,
    directory,
    root,
    subject,
  };
};

export const resolveContext = (env, readBead) => {
  const context = resolveNativeContext(env, readBead);

  const pointer = json(
    checkedFile(
      context.artifactDirectory,
      path.join(context.artifactDirectory, "result.json")
    )
  );

  const { candidate } = context;
  ensure(pointer.candidate === candidate, "Outcome pointer candidate mismatch");

  return { ...context, pointer };
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const integrationArchiveIdentity = (context) => {
  try {
    const receipt = json(
      checkedFile(
        context.directory,
        path.join(context.directory, "integrated.json")
      )
    );

    return Schema.is(integrationIdentity)(receipt) &&
      receipt.candidate === context.candidate
      ? receipt.commit
      : "preflight";
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) {
      return "preflight";
    }

    throw error;
  }
};

const archiveContext = (stage, env, readBead) => {
  const context = resolveNativeContext(env, readBead);

  const steps = {
    integrated: ["publish"],
    prepared: ["prepare"],
    published: ["publish", "accept"],
    reviewed: ["review"],
  };

  ensure(
    steps[stage]?.includes(
      context.subject.metadata?.["gc.ralph_step_id"] ??
        context.subject.metadata?.["gc.step_id"]
    ),
    "Check stage does not match native subject"
  );
  const requestFile = path.join(context.directory, "request.json");
  let requestHash = null;

  try {
    lstatSync(requestFile);
    requestHash = sha256(
      readFileSync(checkedFile(context.directory, requestFile))
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const repo = fileURLToPath(new URL("..", import.meta.url));

  const policy = Object.fromEntries(
    [
      "scripts/skill-update.mjs",
      ...[
        "archive",
        "prepared",
        "qualify",
        "reviewed",
        "integrated",
        "published",
      ].map((name) => `gascity/skill-updates/assets/checks/${name}.sh`),
    ].map((name) => [name, sha256(readFileSync(path.join(repo, name)))])
  );

  const record = {
    assignee: context.subject.assignee,
    candidate: context.candidate,
    integration:
      stage === "integrated" ? integrationArchiveIdentity(context) : null,
    iteration: context.subject.metadata?.["gc.iteration"] ?? "1",
    policy,
    requestHash,
    root: context.root.id,
    schema: "skill-check-evidence.v1",
    stage,
    subject: context.subject.id,
  };

  ensure(
    !env.GC_ITERATION || env.GC_ITERATION === record.iteration,
    "Native iteration mismatch"
  );

  const archive = path.join(
    context.directory,
    "attempts",
    context.root.id,
    context.subject.id,
    "checks",
    stage,
    ...(record.integration ? [record.integration] : [])
  );

  return { ...context, archive, record };
};

const archiveReceiptNames = [
  "request.json",
  "prepared.json",
  "qualified-prepared.json",
  "reviewed.json",
  "integrated.json",
  "qualified-integrated.json",
  "published.json",
];

const archiveNativeNames = ["result.json", "failure.json"];

const snapshotCheckEvidence = (context, phase) => {
  const snapshot = checkedDirectory(
    context.archive,
    path.join(context.archive, phase),
    true
  );

  const missing = [];

  for (const [namespace, directory, names] of [
    ["receipts", context.directory, archiveReceiptNames],
    ["native", context.artifactDirectory, archiveNativeNames],
  ]) {
    const target = checkedDirectory(
      snapshot,
      path.join(snapshot, namespace),
      true
    );

    for (const name of names) {
      const source = path.join(directory, name);
      let stat;

      try {
        stat = lstatSync(source);
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }

        missing.push(`${namespace}/${name}`);
        continue;
      }

      ensure(stat.isFile() && !stat.isSymbolicLink(), "Unsafe evidence file");
      copyFileSync(
        checkedFile(directory, source),
        path.join(target, name),
        constants.COPYFILE_EXCL
      );
    }
  }

  return missing;
};

export const beginCheckArchive = (stage, env, readBead) => {
  const context = archiveContext(stage, env, readBead);
  checkedDirectory(context.directory, path.dirname(context.archive), true);
  mkdirSync(context.archive, { mode: 0o700 });
  writeFileSync(
    path.join(context.archive, "started.json"),
    `${JSON.stringify({ ...context.record, complete: false })}\n`,
    { flag: "wx", mode: 0o600 }
  );

  for (const [name, value] of Object.entries({
    candidate: context.anchor,
    convoy: context.convoy,
    root: context.root,
    subject: context.subject,
  })) {
    writeFileSync(
      path.join(context.archive, `${name}.json`),
      `${JSON.stringify(value)}\n`,
      { flag: "wx", mode: 0o600 }
    );
  }

  snapshotCheckEvidence(context, "before");

  const requestSnapshot = path.join(
    context.archive,
    "before/receipts/request.json"
  );

  ensure(
    (existsSync(requestSnapshot)
      ? sha256(readFileSync(requestSnapshot))
      : null) === context.record.requestHash,
    "Request changed during archive establishment"
  );

  return context.archive;
};

export const finishCheckArchive = (stage, exitCode, env, readBead) => {
  ensure(
    Number.isInteger(exitCode) && exitCode >= 0 && exitCode <= 255,
    "Invalid raw check exit code"
  );
  const context = archiveContext(stage, env, readBead);
  checkedDirectory(context.directory, context.archive);

  const started = json(
    checkedFile(context.archive, path.join(context.archive, "started.json"))
  );

  ensure(
    isDeepStrictEqual(started, { ...context.record, complete: false }),
    "Archive identity changed during check"
  );
  ensure(
    isDeepStrictEqual(
      json(
        checkedFile(context.archive, path.join(context.archive, "exit.json"))
      ),
      { exitCode }
    ),
    "Raw check exit mismatch"
  );
  const missing = snapshotCheckEvidence(context, "after");

  const rawLogs = ["stdout.log", "stderr.log", "qualification.log"].filter(
    (name) => existsSync(path.join(context.archive, name))
  );

  ensure(
    rawLogs.includes("stdout.log") && rawLogs.includes("stderr.log"),
    "Missing raw check output"
  );

  const sealed = checkedDirectory(
    context.archive,
    path.join(context.archive, "sealed"),
    true
  );

  for (const name of rawLogs) {
    const bytes = readFileSync(
      checkedFile(context.archive, path.join(context.archive, name))
    );

    writeFileSync(path.join(sealed, name), bytes, {
      flag: "wx",
      mode: 0o600,
    });
  }

  const allowed = new Set([
    "started.json",
    "exit.json",
    "subject.json",
    "root.json",
    "convoy.json",
    "candidate.json",
    ...rawLogs.flatMap((name) => [name, `sealed/${name}`]),
    ...["before", "after"].flatMap((phase) => [
      ...archiveReceiptNames.map((name) => `${phase}/receipts/${name}`),
      ...archiveNativeNames.map((name) => `${phase}/native/${name}`),
    ]),
  ]);

  const hashes = {};

  for (const entry of readdirSync(context.archive, {
    recursive: true,
    withFileTypes: true,
  })) {
    const file = path.join(entry.parentPath, entry.name);

    if (entry.isDirectory()) {
      checkedDirectory(context.archive, file);
      ensure(
        [
          "before",
          "after",
          "before/receipts",
          "before/native",
          "after/receipts",
          "after/native",
          "sealed",
        ].includes(path.relative(context.archive, file)),
        "Unknown archive directory"
      );
      continue;
    }

    const relative = path.relative(context.archive, file);
    ensure(allowed.has(relative), "Unknown archive evidence");
    const evidence = checkedFile(context.archive, file);

    if (rawLogs.includes(relative)) {
      continue;
    }

    hashes[relative] = sha256(readFileSync(evidence));
  }

  ensure(
    hashes["sealed/stdout.log"] && hashes["sealed/stderr.log"],
    "Missing sealed check output"
  );

  const manifest = {
    ...context.record,
    complete: true,
    completionScope: "captured-snapshots",
    exitCode,
    hashes,
    missing,
    rawLogs: { paths: rawLogs, sealed: false },
  };

  writeFileSync(
    path.join(context.archive, "manifest.json"),
    `${JSON.stringify(manifest)}\n`,
    { flag: "wx", mode: 0o600 }
  );

  return manifest;
};

const validateReview = (review, request, prepared, tree) => {
  ensure(
    review.candidate === request.candidate &&
      review.commit === prepared.commit &&
      review.tree === tree &&
      review.verdict === "pass",
    "Stale or failed review"
  );
  ensure(
    review.reviewer?.trim() &&
      review.reviewer !== prepared.preparer &&
      Array.isArray(review.evidence) &&
      review.evidence.length > 0 &&
      review.evidence.every((item) => item.trim()),
    "Independent review evidence missing"
  );
};

export const validateLandingBase = (base, remote) => {
  ensure(base === remote, "Integration base is not fresh remote main");
};

export const validateRemoteEntry = (expected, actual) => {
  ensure(isDeepStrictEqual(expected, actual), "Remote lock identity mismatch");
};

const fetchMain = (checkout) => {
  git(
    checkout,
    "fetch",
    "--no-tags",
    "https://github.com/benschac/digitial-garden.git",
    "refs/heads/main:refs/remotes/origin/main"
  );

  return git(checkout, "rev-parse", "refs/remotes/origin/main");
};

const validateQualification = (receipt, candidate, base, commit, tree) => {
  ensure(
    receipt.candidate === candidate &&
      receipt.commit === commit &&
      receipt.base === base &&
      receipt.tree === tree,
    "Missing or stale qualification receipt"
  );
};

export const checkStage = (stage, context) => {
  ensure(
    ["prepared", "reviewed", "integrated", "published"].includes(stage) &&
      context.pointer.stage === stage,
    "Invalid artifact stage"
  );

  const load = (name) =>
    json(
      contained(context.directory, path.join(context.directory, `${name}.json`))
    );

  const request = validateRequest(load("request"));
  ensure(request.candidate === context.candidate, "Request candidate mismatch");

  const keys = {
    skill_current_hash: "currentHash",
    skill_name: "skill",
    skill_path: "skillPath",
    skill_scan_base: "scanBase",
    skill_source: "source",
    skill_target_hash: "targetHash",
    skill_target_revision: "targetRevision",
  };

  for (const [key, field] of Object.entries(keys)) {
    ensure(
      context.anchor.metadata?.[key] === request[field],
      `Candidate metadata mismatch: ${key}`
    );
  }

  const prepared = load("prepared");
  ensure(
    prepared.candidate === request.candidate && prepared.preparer?.trim(),
    "Prepared identity missing"
  );
  contained(context.directory, prepared.checkout);
  contained(context.directory, prepared.sourceCheckout);
  ensure(
    prepared.base === request.scanBase,
    "Preparation base changed from scanned identity"
  );

  const tree = validateCommit(
    request,
    prepared.checkout,
    prepared.base,
    prepared.commit,
    prepared.sourceCheckout
  );

  if (stage !== "prepared") {
    validateQualification(
      load("qualified-prepared"),
      request.candidate,
      prepared.base,
      prepared.commit,
      tree
    );
  }

  if (stage === "prepared") {
    ensure(
      context.subject.assignee === prepared.preparer,
      "Preparer identity mismatch"
    );
  }

  if (stage !== "prepared") {
    const review = load("reviewed");
    validateReview(review, request, prepared, tree);

    if (stage === "reviewed") {
      ensure(
        context.subject.assignee === review.reviewer,
        "Reviewer identity mismatch"
      );
    }
  }

  let selected = prepared;

  if (["integrated", "published"].includes(stage)) {
    const publication = load("integrated");
    selected = publication;
    ensure(
      publication.candidate === request.candidate &&
        publication.preparedCommit === prepared.commit &&
        publication.branch === "main",
      "Publication identity mismatch"
    );
    contained(context.directory, publication.checkout);
    ensure(
      allowedOrigin(git(publication.checkout, "remote", "get-url", "origin")),
      "Publication origin mismatch"
    );
    validateCommit(
      request,
      publication.checkout,
      publication.base,
      publication.commit,
      prepared.sourceCheckout
    );

    if (stage === "integrated") {
      validateLandingBase(publication.base, fetchMain(publication.checkout));
    }
  }

  if (stage === "published") {
    const publication = load("published");
    ensure(
      isDeepStrictEqual(publication, selected),
      "Publication differs from qualified integration"
    );
    validateQualification(
      load("qualified-integrated"),
      request.candidate,
      selected.base,
      selected.commit,
      git(selected.checkout, "rev-parse", `${selected.commit}^{tree}`)
    );

    fetchMain(publication.checkout);
    git(
      publication.checkout,
      "merge-base",
      "--is-ancestor",
      publication.commit,
      "refs/remotes/origin/main"
    );

    const remote = git(
      publication.checkout,
      "rev-parse",
      "refs/remotes/origin/main"
    );

    ensure(
      hashFiles(
        treeFiles(
          publication.checkout,
          remote,
          `.agents/skills/${request.skill}`
        )
      ) === request.targetHash,
      "Remote target content mismatch"
    );

    const lock = JSON.parse(
      readObject(publication.checkout, remote, "skills-lock.json")
    );

    const expectedLock = JSON.parse(
      readObject(publication.checkout, publication.commit, "skills-lock.json")
    );

    validateRemoteEntry(
      expectedLock.skills[request.skill],
      lock.skills?.[request.skill]
    );
  }

  return {
    base: selected.base,
    candidate: request.candidate,
    checkout: selected.checkout,
    commit: selected.commit,
    stage,
    tree: git(selected.checkout, "rev-parse", `${selected.commit}^{tree}`),
  };
};

export const main = (args, env = process.env) => {
  if (args[0] === "hash" && args.length === 2) {
    return hashDirectory(args[1]);
  }

  ensure(
    (args[0] === "archive" &&
      ["begin", "finish"].includes(args[1]) &&
      args.length === (args[1] === "begin" ? 3 : 4)) ||
      (args[0] === "check" && args.length === 2) ||
      (args[0] === "qualify" &&
        args.length === 3 &&
        ["prepared", "integrated"].includes(args[1])),
    "Usage: skill-update.mjs hash DIR | check prepared|reviewed|integrated|published"
  );

  const readBead = (id) => {
    ensure(id && !id.startsWith("-"), "Missing native bead identity");

    const result = spawnSync(
      "gc",
      [
        "--city",
        env.GC_CITY,
        "--rig",
        "personal-site",
        "bd",
        "show",
        id,
        "--json",
      ],
      { encoding: "utf-8", timeout: 30_000 }
    );

    if (result.error || result.status !== 0) {
      throw Object.assign(new Error("Native bead store unavailable"), {
        exitCode: 75,
      });
    }

    const rows = recordsFrom(JSON.parse(result.stdout));
    ensure(
      rows.length === 1 && rows[0].id === id,
      "Native bead read identity mismatch"
    );

    return rows[0];
  };

  if (args[0] === "archive") {
    return args[1] === "begin"
      ? beginCheckArchive(args[2], env, readBead)
      : JSON.stringify(
          finishCheckArchive(args[2], Number(args[3]), env, readBead)
        );
  }

  const context = resolveContext(env, readBead);
  const result = checkStage(args[1], context);

  if (args[0] === "qualify") {
    ensure(
      isDeepStrictEqual(JSON.parse(args[2]), result),
      "Tree changed during qualification"
    );

    const receipt = {
      base: result.base,
      candidate: result.candidate,
      commit: result.commit,
      tree: result.tree,
    };

    const destination = path.join(
      context.directory,
      `qualified-${args[1]}.json`
    );

    if (existsSync(destination)) {
      ensure(
        isDeepStrictEqual(
          json(contained(context.directory, destination)),
          receipt
        ),
        "Qualification receipt already exists for another tree"
      );
    } else {
      const temporary = `${destination}.${process.pid}.tmp`;
      writeFileSync(temporary, `${JSON.stringify(receipt)}\n`, { flag: "wx" });
      renameSync(temporary, destination);
    }
  }

  return JSON.stringify(result);
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    console.log(main(process.argv.slice(2)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode ?? 1;
  }
}
