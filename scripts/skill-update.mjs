import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  openSync,
  closeSync,
  fsyncSync,
  renameSync,
  copyFileSync,
  constants,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  realpathSync,
  linkSync,
  unlinkSync,
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

const scanGitEnvironment = () => {
  const redirects = new Set([
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_COMMON_DIR",
    "GIT_OBJECT_DIRECTORY",
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_INDEX_FILE",
    "GIT_GRAFT_FILE",
    "GIT_SHALLOW_FILE",
    "GIT_NAMESPACE",
    "GIT_REPLACE_REF_BASE",
    "GIT_CEILING_DIRECTORIES",
    "GIT_DISCOVERY_ACROSS_FILESYSTEM",
    "GIT_NO_REPLACE_OBJECTS",
    "GIT_EXEC_PATH",
    "GIT_PREFIX",
    "GIT_SUPER_PREFIX",
    "GIT_IMPLICIT_WORK_TREE",
  ]);

  ensure(
    !Object.keys(process.env).some(
      (key) =>
        redirects.has(key) ||
        key === "GIT_CONFIG" ||
        key.startsWith("GIT_CONFIG_")
    ),
    "Inherited scan Git routing or explicit configuration requires review"
  );

  return { ...process.env, GIT_CONFIG_COUNT: "0", GIT_NO_REPLACE_OBJECTS: "1" };
};

const scanGit = (cwd, ...args) => {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    env: scanGitEnvironment(),
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120_000,
  });

  ensure(
    !result.error && result.status === 0,
    `Scan Git failed: ${result.error?.message ?? result.stderr}`
  );

  return result.stdout.trimEnd();
};

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

const requireOrdinaryEntry = (entry) => {
  ensure(
    !Object.hasOwn(entry ?? {}, "customization"),
    "Skill customization requires review"
  );
};

const scanAdmission = (checkout, skill) => {
  ensure(/^[a-z0-9][a-z0-9-]*$/u.test(skill), "Invalid skill name");
  const lock = json(path.join(checkout, "skills-lock.json"));
  const entry = lock.skills?.[skill];
  requireOrdinaryEntry(entry);

  const installedHash = hashDirectory(
    path.join(checkout, ".agents", "skills", skill)
  );

  ensure(
    installedHash === entry?.computedHash,
    "Local skill modifications require review"
  );

  return installedHash;
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

const treeFiles = (cwd, ref, directory, ownedScan = false) => {
  ensure(revision.test(ref), "Invalid Git revision");

  const records = (ownedScan ? scanGit : git)(
    cwd,
    "ls-tree",
    "-r",
    "-z",
    ref,
    "--",
    `${directory}/`
  )
    .split("\0")
    .filter(Boolean);

  ensure(records.length > 0, "Missing skill tree");

  return records.map((record) => {
    const separator = record.indexOf("\t");
    const header = record.slice(0, separator);
    const file = record.slice(separator + 1);
    const [mode, type, object] = header.split(" ");
    ensure(
      type === "blob" && mode === "100644",
      "Executable or symlink skill requires review"
    );
    ensure(
      file.startsWith(`${directory}/`) && safePath(file),
      "Unsafe tree path"
    );

    const options = { cwd, maxBuffer: 32 * 1024 * 1024 };

    if (ownedScan) {
      options.env = scanGitEnvironment();
      options.timeout = 120_000;
    }

    const result = spawnSync("git", ["cat-file", "blob", object], options);

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
  requireOrdinaryEntry(oldEntry);
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

const nativeRole = (step, readBead) => {
  const metadata = step.metadata ?? {};
  const ralph = metadata["gc.ralph_step_id"];
  const direct = metadata["gc.step_id"];
  const reference = metadata["gc.step_ref"];

  if (direct === "update-skill.accept" || reference === "update-skill.accept") {
    const root = readBead(metadata["gc.root_bead_id"]);
    ensure(
      direct === "update-skill.accept" &&
        reference === direct &&
        (ralph === undefined || ralph === "accept") &&
        root?.id === metadata["gc.root_bead_id"] &&
        root?.metadata?.["gc.kind"] === "workflow" &&
        root?.metadata?.["gc.formula_name"] === "update-skill",
      "Native direct acceptance role mismatch"
    );

    return "accept";
  }

  return ralph ?? direct;
};

const singletonExecutorSession = (step, id, name, readBead) => {
  const metadata = step.metadata ?? {};
  const role = nativeRole(step, readBead);

  const target = {
    accept: "skills.publisher",
    prepare: "skills.worker",
    publish: "skills.publisher",
    review: "skills.reviewer",
    scan: "skills.scanner",
  }[role];

  const alias = `personal-site/${target}`;
  ensure(
    target &&
      step.assignee === alias &&
      metadata["gc.routed_to"] === alias &&
      metadata["gc.run_target"] === target &&
      Number.isFinite(Date.parse(step.started_at)) &&
      Number.isFinite(Date.parse(metadata["gc.claimed_at"])),
    "Native subject ownership mismatch"
  );
  const session = readBead(id, "city");
  const sessionMetadata = session?.metadata ?? {};
  ensure(
    session?.id === id &&
      session?.issue_type === "session" &&
      sessionMetadata.session_name === name &&
      sessionMetadata.alias === alias &&
      sessionMetadata.template === alias &&
      sessionMetadata.canonical_instance_name === alias &&
      !sessionMetadata.canonical_pool_slot &&
      !sessionMetadata.pool_slot,
    "Native singleton executor binding mismatch"
  );

  return session;
};

const validateSingletonClaim = (step, session) => {
  ensure(
    (step.status === "closed" &&
      Number.isFinite(Date.parse(step.closed_at)) &&
      Date.parse(step.closed_at) >=
        Date.parse(step.metadata["gc.claimed_at"])) ||
      (step.status === "in_progress" &&
        session.status === "open" &&
        ["active", "awake"].includes(session.metadata.state) &&
        session.metadata.current_claim_bead_id === step.id &&
        Date.parse(step.lease_expires_at) > Date.now()),
    "Native singleton claim is stale or absent"
  );
};

const executorIdentity = (step, readBead) => {
  const id = step.metadata?.["gc.session_id"];
  const name = step.metadata?.["gc.session_name"];
  ensure(
    Schema.is(Schema.NonEmptyString)(id) &&
      Schema.is(Schema.NonEmptyString)(name) &&
      id.trim() === id &&
      name.trim() === name &&
      id.trim().length > 0 &&
      name.trim().length > 0,
    "Native durable executor identity missing"
  );

  if (
    !(
      (step.status === "closed" && !step.assignee) ||
      [id, name].includes(step.assignee)
    )
  ) {
    const session = singletonExecutorSession(step, id, name, readBead);
    validateSingletonClaim(step, session);
  }

  return { id, name };
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
  const owner = executorIdentity(subject, readBead);
  const executor = owner.id;
  const sessionName = owner.name;
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
    candidateDirectory: directory,
    convoy,
    directory,
    executor,
    ownerIdentities: [executor, sessionName].filter(Boolean),
    readBead,
    root,
    subject,
  };
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const hashSchema = Schema.String.check(Schema.isPattern(digest));
const revisionSchema = Schema.String.check(Schema.isPattern(revision));

const artifactSchema = Schema.Struct({
  path: Schema.String,
  sha256: hashSchema,
});

const recoverySchema = Schema.Struct({
  adopter: Schema.NonEmptyString,
  base: revisionSchema,
  candidate: nativeIdentity,
  commit: revisionSchema,
  landingHistory: Schema.Array(
    Schema.Struct({
      attempt: Schema.Int,
      manifest: artifactSchema,
    })
  ),
  lineageComplete: Schema.Literal(true),
  originalPreparer: Schema.NonEmptyString,
  originalStep: artifactSchema,
  prepared: artifactSchema,
  qualification: Schema.Struct({
    log: Schema.optionalKey(artifactSchema),
    mode: Schema.Literals(["required", "reused"]),
    policy: Schema.optionalKey(hashSchema),
    receipt: Schema.optionalKey(artifactSchema),
    trustedOrigin: Schema.optionalKey(Schema.NonEmptyString),
  }),
  repair: nativeIdentity,
  requestHash: hashSchema,
  root: nativeIdentity,
  schema: Schema.Literal(2),
  step: nativeIdentity,
  tree: revisionSchema,
});

const readEvidence = (context, record) => {
  ensure(safePath(record.path), "Unsafe authorized evidence path");

  const file = checkedFile(
    context.directory,
    path.join(context.directory, record.path)
  );

  const bytes = readFileSync(file);
  ensure(sha256(bytes) === record.sha256, "Authorized evidence digest changed");

  return bytes;
};

export const resolveReceiptContext = (env, readBead) => {
  const context = resolveNativeContext(env, readBead);
  const schema = context.root.metadata?.skill_receipt_schema;

  const authorizationHash =
    context.root.metadata?.skill_recovery_authorization_sha256;

  if (!schema) {
    ensure(!authorizationHash, "Contradictory schema authorization");

    return context;
  }

  ensure(
    schema === "2" && digest.test(authorizationHash),
    "Invalid schema-2 authorization"
  );

  const authorizationBytes = readEvidence(context, {
    path: `authorizations/${context.root.id}.json`,
    sha256: authorizationHash,
  });

  const authorization = JSON.parse(authorizationBytes);
  ensure(
    Schema.is(recoverySchema)(authorization),
    "Invalid recovery authorization schema"
  );
  ensure(
    authorization.candidate === context.candidate &&
      authorization.root === context.root.id,
    "Foreign recovery authorization"
  );
  ensure(
    context.root.metadata?.skill_recovery_repair_bead === authorization.repair,
    "Recovery repair root binding mismatch"
  );
  const repair = readBead(authorization.repair);
  ensure(
    repair.id === authorization.repair &&
      repair.metadata?.[
        `skill_recovery_authorization.${context.root.id}.sha256`
      ] === authorizationHash,
    "Recovery lacks explicit repair approval"
  );
  const drain = context.root.metadata?.["gc.drain_control_id"];
  ensure(
    identity.test(drain) &&
      context.convoy.metadata?.["gc.drain_control_id"] === drain &&
      context.anchor.metadata?.["gc.exclusive_drain_reservation"] === drain,
    "Native exclusive reservation mismatch"
  );
  const control = readBead(drain);
  ensure(
    control.id === drain && ["open", "in_progress"].includes(control.status),
    "Native drain is terminal"
  );

  const manifest = JSON.parse(
    control.metadata?.["gc.drain_manifest.v1"] ?? "null"
  );

  ensure(
    manifest?.version === 1 &&
      manifest.rows?.filter(
        (row) =>
          row.member_id === context.candidate &&
          row.unit_convoy_id === context.convoy.id &&
          row.item_root_id === context.root.id
      ).length === 1,
    "Native drain manifest mismatch"
  );
  ensure(
    sha256(
      readFileSync(
        checkedFile(
          context.directory,
          path.join(context.directory, "request.json")
        )
      )
    ) === authorization.requestHash,
    "Authorized request changed"
  );

  const receiptDirectory = path.join(
    context.directory,
    "attempts",
    context.root.id
  );

  return {
    ...context,
    authorization,
    authorizationHash,
    receiptDirectory,
    schema: 2,
  };
};

export const resolveWriteContext = (env, readBead, readClaim) => {
  const context = resolveReceiptContext(env, readBead);

  const assertLive = () => {
    const fresh = resolveReceiptContext(env, readBead);
    ensure(
      fresh.schema === 2 &&
        fresh.subject.status === "in_progress" &&
        readClaim() === fresh.subject.id &&
        env.GC_SESSION_ID === fresh.executor &&
        (!env.GC_SESSION_NAME ||
          env.GC_SESSION_NAME === fresh.subject.metadata["gc.session_name"]) &&
        (!env.BEADS_ACTOR ||
          fresh.ownerIdentities.includes(env.BEADS_ACTOR) ||
          env.BEADS_ACTOR === fresh.subject.assignee) &&
        fresh.subject.id === context.subject.id &&
        fresh.executor === context.executor &&
        fresh.authorizationHash === context.authorizationHash,
      "Receipt write requires real live claim"
    );
  };

  assertLive();

  return { ...context, assertLive };
};

export const writeImmutable = (directory, name, bytes) => {
  ensure(safePath(name), "Unsafe immutable receipt path");

  const parent = checkedDirectory(
    directory,
    path.dirname(path.join(directory, name)),
    true
  );

  const destination = path.join(directory, name);

  const temporary = path.join(
    parent,
    `.receipt-${process.pid}-${createHash("sha256").update(bytes).digest("hex")}.tmp`
  );

  writeFileSync(temporary, bytes, { flag: "wx", mode: 0o600 });
  const descriptor = openSync(temporary, "r");

  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }

  try {
    try {
      linkSync(temporary, destination);
      const directoryDescriptor = openSync(parent, "r");

      try {
        fsyncSync(directoryDescriptor);
      } finally {
        closeSync(directoryDescriptor);
      }
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }

      ensure(
        readFileSync(checkedFile(directory, destination)).equals(
          Buffer.from(bytes)
        ),
        "Conflicting immutable receipt"
      );
    }
  } finally {
    unlinkSync(temporary);
  }
};

const writeRecord = (directory, name, value) =>
  writeImmutable(directory, name, `${JSON.stringify(value)}\n`);

const validateIdentityMappings = (identities) => {
  for (const [index, first] of identities.entries()) {
    for (const second of identities.slice(index + 1)) {
      if (first.id === second.id) {
        ensure(
          first.name === second.name,
          "Native executor identity is ambiguous"
        );
      } else {
        ensure(
          first.name !== second.name &&
            first.id !== second.name &&
            first.name !== second.id,
          "Native executor identity is ambiguous"
        );
      }
    }
  }
};

const preparationIdentities = (context) => {
  const original = JSON.parse(
    readEvidence(context, context.authorization.originalStep)
  );

  ensure(
    identity.test(original.id) &&
      identity.test(original.metadata?.["gc.root_bead_id"]),
    "Invalid original native preparation identity"
  );

  const originalRole = nativeRole(original, context.readBead);

  ensure(
    originalRole === "prepare",
    "Original identity is not a preparation step"
  );
  const originalIdentity = executorIdentity(original, context.readBead);
  ensure(
    [originalIdentity.id, originalIdentity.name].includes(
      context.authorization.originalPreparer
    ),
    "Original preparer normalization is ambiguous"
  );
  const adopted = context.readBead(context.authorization.step);
  ensure(
    adopted.id === context.authorization.step &&
      adopted.metadata?.["gc.root_bead_id"] === context.root.id,
    "Foreign native adopter step"
  );

  const adoptedRole = nativeRole(adopted, context.readBead);

  ensure(adoptedRole === "prepare", "Adopter is not the native preparer");
  const adopterIdentity = executorIdentity(adopted, context.readBead);
  ensure(
    [adopterIdentity.id, adopterIdentity.name].includes(
      context.authorization.adopter
    ),
    "Adopter normalization is ambiguous"
  );

  validateIdentityMappings([adopterIdentity, originalIdentity]);

  return { adopterIdentity, originalIdentity };
};

const adoptionInput = (context) => {
  const a = context.authorization;
  const { adopterIdentity, originalIdentity } = preparationIdentities(context);
  const bytes = readEvidence(context, a.prepared);
  const prepared = JSON.parse(bytes);

  const request = validateRequest(
    json(
      checkedFile(
        context.directory,
        path.join(context.directory, "request.json")
      )
    )
  );

  ensure(
    request.candidate === context.candidate &&
      prepared.candidate === context.candidate &&
      prepared.preparer === a.originalPreparer &&
      prepared.base === request.scanBase &&
      prepared.base === a.base &&
      prepared.commit === a.commit,
    "Retained preparation identity changed"
  );
  contained(context.directory, prepared.checkout);
  contained(context.directory, prepared.sourceCheckout);

  const tree = validateCommit(
    request,
    prepared.checkout,
    prepared.base,
    prepared.commit,
    prepared.sourceCheckout
  );

  ensure(tree === a.tree, "Authorized preparation tree changed");

  return {
    envelope: {
      adopter: a.adopter,
      adopterSessionId: adopterIdentity.id,
      adopterSessionName: adopterIdentity.name,
      authorizationHash: context.authorizationHash,
      base: prepared.base,
      candidate: context.candidate,
      commit: prepared.commit,
      currentHash: request.currentHash,
      originalPreparer: prepared.preparer,
      originalSessionId: originalIdentity.id,
      originalSessionName: originalIdentity.name,
      originalStepHash: a.originalStep.sha256,
      preparedHash: a.prepared.sha256,
      preparedPath: a.prepared.path,
      requestHash: a.requestHash,
      root: context.root.id,
      schema: 2,
      source: request.source,
      sourcePath: request.skillPath,
      sourceRevision: request.targetRevision,
      step: a.step,
      targetHash: request.targetHash,
      tree,
    },
    prepared,
    request,
  };
};

const binding = (context) => ({
  adoptionHash: sha256(
    readFileSync(
      checkedFile(
        context.receiptDirectory,
        path.join(context.receiptDirectory, "adoption.json")
      )
    )
  ),
  authorizationHash: context.authorizationHash,
  candidate: context.candidate,
  preparedHash: context.authorization.prepared.sha256,
  requestHash: context.authorization.requestHash,
  root: context.root.id,
  schema: 2,
});

const validateBinding = (record, context) => {
  for (const [key, value] of Object.entries(binding(context))) {
    ensure(record[key] === value, `Receipt binding mismatch: ${key}`);
  }
};

export const resolveContext = (env, readBead) => {
  const context = resolveReceiptContext(env, readBead);
  ensure(
    context.subject.status !== "closed" ||
      context.subject.metadata?.["gc.outcome"] === "pass",
    "Closed check subject did not pass"
  );

  const pointer = json(
    checkedFile(
      context.artifactDirectory,
      path.join(context.artifactDirectory, "result.json")
    )
  );

  const { candidate } = context;
  ensure(pointer.candidate === candidate, "Outcome pointer candidate mismatch");

  if (context.schema === 2) {
    validateBinding(pointer, context);
    ensure(pointer.step === context.subject.id, "Foreign selector step");
  } else {
    ensure(!pointer.schema, "Schema-2 pointer requires root authorization");
  }

  return { ...context, pointer };
};

const validateAdoption = (context) => {
  const { prepared, envelope } = adoptionInput(context);
  const step = context.readBead(envelope.step);
  ensure(
    step.id === envelope.step &&
      step.metadata?.["gc.root_bead_id"] === context.root.id &&
      [
        step.metadata?.["gc.session_id"],
        step.metadata?.["gc.session_name"],
      ].includes(envelope.adopter),
    "Adopter differs from native preparation executor"
  );
  ensure(
    isDeepStrictEqual(
      json(
        checkedFile(
          context.receiptDirectory,
          path.join(context.receiptDirectory, "adoption.json")
        )
      ),
      envelope
    ),
    "Adoption envelope changed"
  );

  const manifest = json(
    checkedFile(
      context.receiptDirectory,
      path.join(context.receiptDirectory, "manifest.json")
    )
  );

  validateBinding(manifest, context);
  ensure(manifest.complete === true, "Incomplete adoption");

  return prepared;
};

export const adoptPreparation = (context) => {
  const { envelope } = adoptionInput(context);
  ensure(
    context.subject.id === envelope.step &&
      context.ownerIdentities.includes(envelope.adopter),
    "Adopter claim differs from authorization"
  );
  context.assertLive();
  checkedDirectory(context.directory, context.receiptDirectory, true);
  const manifest = path.join(context.receiptDirectory, "manifest.json");

  if (existsSync(manifest)) {
    validateAdoption(context);

    return envelope;
  }

  const names = readdirSync(context.receiptDirectory);
  ensure(
    names.every((name) => ["adoption.json", "manifest.json"].includes(name)),
    "Unknown partial adoption state"
  );

  if (existsSync(path.join(context.receiptDirectory, "adoption.json"))) {
    ensure(existsSync(manifest), "Incomplete adoption manifest holds");
  }

  context.assertLive();
  writeRecord(context.receiptDirectory, "adoption.json", envelope);
  context.assertLive();
  writeRecord(context.receiptDirectory, "manifest.json", {
    ...binding(context),
    complete: true,
  });

  return envelope;
};

const landingDirectory = (context, attempt) => {
  ensure(
    Number.isInteger(attempt) && attempt >= 1 && attempt <= 3,
    "Landing attempt limit"
  );

  return path.join(context.receiptDirectory, "landing", String(attempt));
};

const validateLandingContents = (context, attempt) => {
  const directory = landingDirectory(context, attempt);

  if (!existsSync(directory)) {
    return;
  }

  checkedDirectory(context.directory, directory);

  const allowed = new Set([
    "checkout",
    "integrated.json",
    "qualified-integrated.json",
    "published.json",
    "manifest.json",
    "remote-race.json",
    "selectors",
  ]);

  ensure(
    readdirSync(directory).every((name) => allowed.has(name)),
    "Unknown landing partial state"
  );
};

const validateLineage = (context) => {
  const history = context.authorization.landingHistory;
  ensure(history.length <= 3, "Landing history exceeds limit");

  for (const [index, entry] of history.entries()) {
    ensure(entry.attempt === index + 1, "Unknown landing count");
    const manifest = JSON.parse(readEvidence(context, entry.manifest));
    ensure(
      manifest.candidate === context.candidate &&
        manifest.attempt === entry.attempt &&
        manifest.complete === true,
      "Invalid retained landing lineage"
    );
  }

  return history.length;
};

const archiveLandingDirectory = (context) => {
  const pointer = json(
    checkedFile(
      context.artifactDirectory,
      path.join(context.artifactDirectory, "result.json")
    )
  );

  const selectorSchema = Schema.Struct({
    attempt: Schema.Int,
    stage: Schema.Literals(["integrated", "published"]),
    step: nativeIdentity,
  });

  if (
    !Schema.is(selectorSchema)(pointer) ||
    pointer.step !== context.subject.id ||
    !Object.entries(binding(context)).every(
      ([key, value]) => pointer[key] === value
    ) ||
    pointer.attempt < 1 ||
    pointer.attempt > 3
  ) {
    return null;
  }

  return landingDirectory(context, pointer.attempt);
};

const integrationArchiveIdentity = (context) => {
  if (context.root.metadata?.skill_receipt_schema && context.schema !== 2) {
    return "preflight";
  }

  try {
    let { directory } = context;

    if (context.schema === 2) {
      directory = archiveLandingDirectory(context);

      if (!directory) {
        return "preflight";
      }
    }

    const receipt = json(
      checkedFile(directory, path.join(directory, "integrated.json"))
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

const scanSourceSchema = Schema.Struct({
  materializedDirectory: Schema.NonEmptyString,
  repository: Schema.NonEmptyString,
  revision: revisionSchema,
  skill: Schema.NonEmptyString,
  skillPath: Schema.NonEmptyString,
});

const scanReportSchema = Schema.Struct({
  details: Schema.optionalKey(Schema.Unknown),
  retainedManifest: artifactSchema,
  scan: Schema.Struct({
    assignee: Schema.NonEmptyString,
    checkout: Schema.NonEmptyString,
    registeredCheckout: Schema.NonEmptyString,
    registeredRevision: revisionSchema,
    root: nativeIdentity,
    scanBase: revisionSchema,
    session: Schema.NonEmptyString,
    step: nativeIdentity,
    validatedRemoteRevision: Schema.optionalKey(revisionSchema),
  }),
  schema: Schema.Literal("gc.skill-scan-report.v2"),
  state: Schema.Literal("complete"),
});

const canonicalScanDirectory = (owner, location) => {
  ensure(
    path.isAbsolute(owner) &&
      path.resolve(owner) === owner &&
      realpathSync(owner) === owner &&
      path.isAbsolute(location) &&
      path.resolve(location) === location &&
      realpathSync(location) === location,
    "Noncanonical or symlinked scan directory"
  );
  const actual = checkedDirectory(owner, location);
  ensure(actual === location, "Validated scan path differs from declared path");

  return actual;
};

const validateScanGit = (directory, repository) => {
  scanGitEnvironment();
  canonicalScanDirectory(directory, repository);

  const control = canonicalScanDirectory(
    repository,
    path.join(repository, ".git")
  );

  canonicalScanDirectory(control, path.join(control, "objects"));

  for (const relative of [
    "commondir",
    "config.worktree",
    "gitdir",
    "objects/info/alternates",
    "objects/info/http-alternates",
  ]) {
    ensure(
      !existsSync(path.join(control, relative)),
      "Shared or alternate scan Git storage requires review"
    );
  }

  const validateEntries = (current) => {
    canonicalScanDirectory(control, current);

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const location = path.join(current, entry.name);

      if (entry.isDirectory()) {
        validateEntries(location);
      } else {
        checkedFile(control, location);
      }
    }
  };

  validateEntries(control);

  const configuration = readFileSync(
    checkedFile(control, path.join(control, "config")),
    "utf-8"
  );

  ensure(
    !/^\s*\[\s*include(?:if)?(?:\s|\])/imu.test(configuration),
    "External scan Git config includes require review"
  );
  ensure(
    !/^\s*\[\s*extensions\s*\]/imu.test(configuration),
    "Scan Git extensions require review"
  );

  const actual = scanGit(
    repository,
    "rev-parse",
    "--path-format=absolute",
    "--git-dir",
    "--git-common-dir",
    "--show-toplevel",
    "--is-bare-repository"
  ).split("\n");

  ensure(
    isDeepStrictEqual(actual, [control, control, repository, "false"]),
    "Scan Git control/common/worktree identity differs from owned clone"
  );
};

const scanFiles = (directory) => {
  const files = [];

  const walk = (current, prefix) => {
    checkedDirectory(directory, current);

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      ensure(safePath(relative), "Unsafe scan member path");
      const file = path.join(current, entry.name);
      const stat = lstatSync(file);
      ensure(!stat.isSymbolicLink(), "Scan symlink requires review");

      if (stat.isDirectory()) {
        walk(file, relative);
      } else {
        ensure(
          stat.isFile() && stat.mode % 0o1_0000 === 0o644,
          "Unsupported scan file kind or mode requires review"
        );
        files.push([relative, readFileSync(checkedFile(directory, file))]);
      }
    }
  };

  walk(directory, "");

  return files.toSorted(([a], [b]) => a.localeCompare(b));
};

const scanMembers = (files) =>
  files.map(([name, bytes]) => ({
    gitBlob: createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex"),
    kind: "file",
    mode: "0644",
    path: name,
    sha256: sha256(bytes),
  }));

export const collectScanEvidence = (checkout, scanBase, input, directory) => {
  ensure(revision.test(scanBase), "Invalid scan base");
  canonicalScanDirectory(directory, checkout);
  validateScanGit(directory, checkout);

  const installedRoot = canonicalScanDirectory(
    checkout,
    path.join(checkout, ".agents/skills")
  );

  ensure(
    scanGit(checkout, "rev-parse", "HEAD") === scanBase,
    "Scan checkout base changed"
  );

  const sources = Schema.decodeUnknownSync(Schema.Array(scanSourceSchema), {
    onExcessProperty: "error",
  })(input);

  const lockBytes = readFileSync(
    checkedFile(checkout, path.join(checkout, "skills-lock.json"))
  );

  const lock = JSON.parse(lockBytes);
  ensure(
    Schema.is(
      Schema.Struct({
        skills: Schema.Record(Schema.String, Schema.Unknown),
        version: Schema.Literal(1),
      })
    )(lock),
    "Invalid scan lock schema"
  );
  ensure(
    isDeepStrictEqual(
      lock,
      JSON.parse(scanGit(checkout, "show", `${scanBase}:skills-lock.json`))
    ),
    "Scan lock differs from pinned base"
  );

  const records = scanGit(
    checkout,
    "ls-tree",
    "-r",
    "-z",
    scanBase,
    "--",
    ".agents/skills/"
  )
    .split("\0")
    .filter(Boolean);

  const names = [
    ...new Set(
      records.map((record) => {
        const file = record.slice(record.indexOf("\t") + 1);
        ensure(safePath(file), "Unsafe tracked skill member");

        return file.split("/")[2];
      })
    ),
  ].toSorted((a, b) => a.localeCompare(b));

  ensure(names.length > 0, "Missing tracked skill inventory");

  const actualNames = readdirSync(installedRoot).toSorted((a, b) =>
    a.localeCompare(b)
  );

  ensure(
    isDeepStrictEqual(actualNames, names),
    "Untracked or missing skill directory requires review"
  );
  ensure(
    Object.keys(lock.skills).every((name) => names.includes(name)),
    "Lock skill lacks tracked installed tree"
  );
  ensure(
    new Set(sources.map((source) => source.skill)).size === sources.length,
    "Duplicate scan source"
  );
  ensure(
    isDeepStrictEqual(
      sources.map((source) => source.skill).toSorted(),
      Object.keys(lock.skills).toSorted()
    ),
    "Incomplete pinned source inventory"
  );

  const installed = names.map((skill) => {
    ensure(/^[a-z0-9][a-z0-9-]*$/u.test(skill), "Invalid tracked skill name");
    const prefix = `.agents/skills/${skill}`;

    const installedDirectory = canonicalScanDirectory(
      checkout,
      path.join(checkout, prefix)
    );

    const files = scanFiles(installedDirectory);
    ensure(
      sameFiles(files, treeFiles(checkout, scanBase, prefix, true)),
      "Installed members differ from pinned scan base"
    );

    return {
      hash: hashFiles(files),
      localOnly: !Object.hasOwn(lock.skills, skill),
      members: scanMembers(files),
      skill,
    };
  });

  const collectedSources = sources
    .toSorted((a, b) => a.skill.localeCompare(b.skill))
    .map((source) => {
      const entry = lock.skills[source.skill];
      ensure(
        Schema.is(
          Schema.Struct({
            computedHash: hashSchema,
            skillPath: Schema.NonEmptyString,
            source: Schema.NonEmptyString,
            sourceType: Schema.Literal("github"),
          })
        )(entry),
        "Unsupported source requires review"
      );
      ensure(
        safePath(source.skillPath) &&
          source.skillPath.endsWith("/SKILL.md") &&
          source.skillPath === entry.skillPath,
        "Unsafe or changed source skillPath"
      );
      ensure(
        /^[a-zA-Z0-9][a-zA-Z0-9_.-]*\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/u.test(
          entry.source
        ),
        "Unsupported source repository"
      );
      canonicalScanDirectory(directory, source.repository);
      canonicalScanDirectory(directory, source.materializedDirectory);
      ensure(
        !source.materializedDirectory.startsWith(`${checkout}${path.sep}`) &&
          source.materializedDirectory !== checkout,
        "Materialized source overlaps installed checkout"
      );
      validateScanGit(directory, source.repository);
      const origin = scanGit(source.repository, "remote", "get-url", "origin");
      ensure(
        [
          `https://github.com/${entry.source}.git`,
          `https://github.com/${entry.source}`,
          `git@github.com:${entry.source}.git`,
        ].includes(origin),
        "Pinned source origin mismatch"
      );

      const expected = treeFiles(
        source.repository,
        source.revision,
        path.posix.dirname(source.skillPath),
        true
      );

      const actual = scanFiles(source.materializedDirectory);
      ensure(
        sameFiles(expected, actual),
        "Materialized source members differ from pinned Git source"
      );

      return {
        ...source,
        hash: hashFiles(expected),
        members: scanMembers(expected),
      };
    });

  return {
    checkout,
    installed,
    lockSha256: sha256(lockBytes),
    scanBase,
    schema: "skill-scan-evidence.v1",
    sources: collectedSources,
  };
};

export const validateScanEvidence = (evidence, directory) => {
  ensure(
    Schema.is(
      Schema.Struct({
        checkout: Schema.NonEmptyString,
        scanBase: revisionSchema,
        schema: Schema.Literal("skill-scan-evidence.v1"),
        sources: Schema.Array(Schema.Unknown),
      })
    )(evidence),
    "Invalid scan evidence schema"
  );

  const references = evidence.sources.map((source) => ({
    materializedDirectory: source.materializedDirectory,
    repository: source.repository,
    revision: source.revision,
    skill: source.skill,
    skillPath: source.skillPath,
  }));

  const actual = collectScanEvidence(
    evidence.checkout,
    evidence.scanBase,
    references,
    directory
  );

  ensure(
    isDeepStrictEqual(evidence, actual),
    "Scan evidence members, canonical hash or complete installed inventory mismatch"
  );

  return actual;
};

const preflightScanReport = (input, context) => {
  const report = Schema.decodeUnknownSync(scanReportSchema, {
    onExcessProperty: "error",
  })(input);

  const { scan } = report;
  ensure(
    scan.step === context.subject.id &&
      scan.root === context.root.id &&
      scan.assignee === context.subject.assignee &&
      scan.session === context.executor,
    "Scan report native identity mismatch"
  );
  canonicalScanDirectory(context.directory, scan.checkout);
  validateScanGit(context.directory, scan.checkout);
  canonicalScanDirectory(
    scan.checkout,
    path.join(scan.checkout, ".agents/skills")
  );
  ensure(
    path.isAbsolute(scan.registeredCheckout) &&
      path.resolve(scan.registeredCheckout) === scan.registeredCheckout &&
      realpathSync(scan.registeredCheckout) === scan.registeredCheckout,
    "Unsafe registered checkout"
  );
  ensure(
    !context.registeredDirectory ||
      scan.registeredCheckout === context.registeredDirectory,
    "Registered rig path changed"
  );
  const retained = report.retainedManifest;
  ensure(
    retained.path === path.join(context.directory, "scan-evidence.json") &&
      !retained.path.startsWith(`${scan.checkout}${path.sep}`),
    "Retained evidence self-binding or unexpected path"
  );
  const bytes = readFileSync(checkedFile(context.directory, retained.path));
  ensure(
    sha256(bytes) === retained.sha256,
    "Retained evidence digest differs from actual final bytes"
  );
  const evidence = JSON.parse(bytes.toString("utf-8"));
  ensure(
    Schema.is(
      Schema.Struct({
        checkout: Schema.NonEmptyString,
        scanBase: revisionSchema,
        sources: Schema.Array(scanSourceSchema),
      })
    )(evidence) &&
      evidence.checkout === scan.checkout &&
      evidence.scanBase === scan.scanBase,
    "Retained scan Git source identities differ from report"
  );

  for (const source of evidence.sources) {
    validateScanGit(context.directory, source.repository);
  }

  return report;
};

export const validateScanReport = (
  input,
  context,
  readFreshBase,
  finalizing = false
) => {
  const proposed = preflightScanReport(input, context);
  ensure(
    finalizing || revision.test(proposed.scan.validatedRemoteRevision ?? ""),
    "Missing finalized remote revision"
  );

  const freshBase = Schema.is(revisionSchema)(readFreshBase)
    ? readFreshBase
    : readFreshBase(proposed.scan.checkout);

  ensure(revision.test(freshBase), "Invalid fresh scan base");

  const report = finalizing
    ? {
        ...proposed,
        scan: { ...proposed.scan, validatedRemoteRevision: freshBase },
      }
    : proposed;

  const { scan } = report;

  for (const remote of new Set([freshBase, scan.validatedRemoteRevision])) {
    ensure(
      scanGit(
        scan.checkout,
        "diff",
        "--name-only",
        scan.scanBase,
        remote,
        "--",
        ".agents/skills",
        "skills-lock.json"
      ) === "",
      "Fresh or finalized remote skill or lock scope changed"
    );
  }

  ensure(
    scanGit(scan.registeredCheckout, "rev-parse", "HEAD") ===
      scan.registeredRevision,
    "Registered divergence identity changed"
  );

  const evidence = validateScanEvidence(
    json(checkedFile(context.directory, report.retainedManifest.path)),
    context.directory
  );

  ensure(
    evidence.checkout === scan.checkout && evidence.scanBase === scan.scanBase,
    "Report and evidence base or checkout mismatch"
  );

  return { evidence, report, validatedRemoteRevision: freshBase };
};

const validateLiveScanClaim = (env, subject, session, owner) => {
  ensure(
    env.GC_SESSION_ID === owner.id &&
      env.BEADS_ACTOR === subject.assignee &&
      env.GC_INSTANCE_TOKEN &&
      env.GC_INSTANCE_TOKEN === session.metadata.instance_token &&
      Date.parse(subject.lease_expires_at) > Date.now() &&
      session.metadata.current_claim_bead_id === subject.id,
    "Live scanner claim, instance or lease missing"
  );
  ensure(
    command("gc", ["--city", env.GC_CITY, "hook", "current", "--id-only"]) ===
      subject.id,
    "Actual live scanner hook mismatch"
  );
};

const resolveScanContext = (env, readBead) => {
  ensure(
    Schema.is(
      Schema.Struct({
        GC_BEAD_ID: nativeIdentity,
        GC_CITY: Schema.NonEmptyString,
      })
    )(env),
    "Missing native scan context"
  );
  ensure(path.isAbsolute(env.GC_CITY), "Expected absolute scan city");
  const subject = readBead(env.GC_BEAD_ID);
  ensure(
    subject.id === env.GC_BEAD_ID &&
      ["in_progress", "closed"].includes(subject.status),
    "Invalid native scan subject"
  );
  const rootId = subject.metadata?.["gc.root_bead_id"];
  ensure(identity.test(rootId ?? ""), "Invalid native scan root");
  const root = readBead(rootId);
  ensure(
    root.id === rootId &&
      Schema.is(
        Schema.Struct({
          metadata: Schema.Struct({
            "gc.formula_name": Schema.Literal("scan-skills"),
            "gc.kind": Schema.Literal("workflow"),
          }),
          status: Schema.Literals(["open", "in_progress"]),
        })
      )(root),
    "Unexpected native scan workflow"
  );
  ensure(
    nativeRole(subject, readBead) === "scan",
    "Unexpected native scan role"
  );
  ensure(
    subject.assignee === "personal-site/skills.scanner" &&
      subject.metadata?.["gc.routed_to"] === "personal-site/skills.scanner" &&
      subject.metadata?.["gc.run_target"] === "skills.scanner",
    "Native scanner route or assignee mismatch"
  );
  const owner = executorIdentity(subject, readBead);
  const molecule = path.join(env.GC_CITY, ".gc/molecules", root.id);
  const artifactDirectory = path.join(molecule, "artifacts", subject.id);
  ensure(
    env.GC_ARTIFACT_DIR === artifactDirectory &&
      (!env.GC_MOLECULE_DIR || env.GC_MOLECULE_DIR === molecule) &&
      (!env.GC_ROOT_BEAD_ID || env.GC_ROOT_BEAD_ID === root.id),
    "Native scan artifact identity mismatch"
  );
  checkedDirectory(env.GC_CITY, artifactDirectory);
  const directory = path.join(env.GC_CITY, ".gc/skill-updates", subject.id);
  checkedDirectory(env.GC_CITY, directory);
  const session = readBead(owner.id, "city");
  ensure(
    session.id === owner.id &&
      session.metadata?.agent_name === subject.assignee,
    "Native scan executor session mismatch"
  );

  if (subject.status === "in_progress") {
    validateLiveScanClaim(env, subject, session, owner);
  } else {
    ensure(
      subject.metadata?.["gc.outcome"] === "pass" &&
        Number.isFinite(Date.parse(subject.closed_at)),
      "Scan subject did not close pass"
    );
  }

  return {
    artifactDirectory,
    directory,
    executor: owner.id,
    readBead,
    root,
    subject,
  };
};

const freshScanBase = (checkout) => {
  ensure(
    allowedOrigin(scanGit(checkout, "remote", "get-url", "origin")),
    "Unexpected scan origin"
  );

  const ssh = scanGit(
    checkout,
    "ls-remote",
    "git@github.com:benschac/digitial-garden.git",
    "refs/heads/main"
  ).split(/\s+/u);

  const https = scanGit(
    checkout,
    "ls-remote",
    "https://github.com/benschac/digitial-garden.git",
    "refs/heads/main"
  ).split(/\s+/u);

  ensure(
    ssh.length === 2 &&
      ssh[1] === "refs/heads/main" &&
      isDeepStrictEqual(ssh, https) &&
      revision.test(ssh[0]),
    "Fresh scan remote disagreement"
  );
  scanGit(checkout, "fetch", "--no-tags", "origin", "refs/heads/main");
  ensure(
    scanGit(checkout, "rev-parse", "FETCH_HEAD") === ssh[0],
    "Remote changed during scan validation"
  );

  return ssh[0];
};

const scannedArchiveContext = (env, readBead) => {
  const context = resolveScanContext(env, readBead);
  ensure(
    context.subject.status === "closed",
    "Native scan check requires closed iteration"
  );
  const iteration = context.subject.metadata?.["gc.iteration"] ?? "1";
  ensure(
    !env.GC_ITERATION || env.GC_ITERATION === iteration,
    "Native scan iteration mismatch"
  );
  const repo = fileURLToPath(new URL("..", import.meta.url));

  const policy = Object.fromEntries(
    [
      "scripts/skill-update.mjs",
      "gascity/skill-updates/assets/checks/scanned.sh",
      "gascity/skill-updates/assets/checks/archive.sh",
    ].map((name) => [name, sha256(readFileSync(path.join(repo, name)))])
  );

  return {
    ...context,
    archive: path.join(
      context.directory,
      "attempts",
      context.root.id,
      context.subject.id,
      "checks/scanned"
    ),
    record: {
      assignee: context.subject.assignee,
      executorSessionId: context.executor,
      integration: null,
      iteration,
      node: {
        path: realpathSync(process.execPath),
        sha256: sha256(readFileSync(process.execPath)),
        version: process.version,
      },
      policy,
      requestHash: null,
      root: context.root.id,
      schema: "skill-check-evidence.v1",
      stage: "scanned",
      subject: context.subject.id,
    },
  };
};

const runScanCommand = (args, env, readBead) => {
  const context = resolveScanContext(env, readBead);

  const rigs = JSON.parse(
    command("gc", ["--city", env.GC_CITY, "rig", "list", "--json"])
  );

  ensure(
    Schema.is(
      Schema.Struct({
        rigs: Schema.Array(
          Schema.Struct({ name: Schema.String, path: Schema.String })
        ),
      })
    )(rigs),
    "Invalid native rig inventory"
  );
  const registered = rigs.rigs.filter((rig) => rig.name === "personal-site");
  ensure(
    registered.length === 1 && registered[0].path === env.SKILL_REGISTERED_RIG,
    "Trusted registered rig path mismatch"
  );
  context.registeredDirectory = registered[0].path;

  const engines = json(path.join(context.registeredDirectory, "package.json"))
    .engines?.node;

  ensure(
    engines === ">=24.15.0" &&
      (Number(process.versions.node.split(".")[0]) > 24 ||
        (Number(process.versions.node.split(".")[0]) === 24 &&
          Number(process.versions.node.split(".")[1]) >= 15)),
    "Host Node does not meet the registered root engine"
  );

  if (args[0] === "scan-collect") {
    ensure(
      context.subject.status === "in_progress",
      "Collection requires live scanner"
    );
    const input = json(checkedFile(context.directory, args[1]));

    const evidence = collectScanEvidence(
      input.checkout,
      input.scanBase,
      input.sources,
      context.directory
    );

    resolveScanContext(env, readBead);
    writeRecord(context.directory, "scan-evidence.json", evidence);

    return JSON.stringify({
      path: path.join(context.directory, "scan-evidence.json"),
      sha256: sha256(
        readFileSync(path.join(context.directory, "scan-evidence.json"))
      ),
    });
  }

  const reportPath =
    args[0] === "scan-finalize"
      ? checkedFile(context.directory, args[1])
      : path.join(context.directory, "scan-report.json");

  if (args[0] === "scan-check") {
    ensure(
      context.subject.status === "closed" &&
        context.subject.metadata?.skill_scan_report_path === reportPath,
      "Native canonical scan report pointer mismatch"
    );
    ensure(
      sha256(readFileSync(checkedFile(context.directory, reportPath))) ===
        context.subject.metadata?.skill_scan_report_sha256,
      "Native canonical report digest mismatch"
    );
  } else {
    ensure(
      context.subject.status === "in_progress",
      "Finalization requires live scanner"
    );
  }

  ensure(context.registeredDirectory, "Trusted registered rig path required");
  const report = json(checkedFile(context.directory, reportPath));

  const validated = validateScanReport(
    report,
    context,
    freshScanBase,
    args[0] === "scan-finalize"
  );

  if (args[0] === "scan-finalize") {
    resolveScanContext(env, readBead);
    writeRecord(context.directory, "scan-report.json", validated.report);
  }

  const canonical = path.join(context.directory, "scan-report.json");

  return JSON.stringify({
    finalizedRemoteRevision: validated.report.scan.validatedRemoteRevision,
    path: canonical,
    scanBase: validated.report.scan.scanBase,
    sha256: sha256(readFileSync(checkedFile(context.directory, canonical))),
    state: "validated",
    validatedRemoteRevision: validated.validatedRemoteRevision,
  });
};

const archiveContext = (stage, env, readBead) => {
  if (stage === "scanned") {
    return scannedArchiveContext(env, readBead);
  }

  let context = resolveNativeContext(env, readBead);
  let receiptContextError = null;

  if (context.root.metadata?.skill_receipt_schema) {
    try {
      context = resolveReceiptContext(env, readBead);
    } catch (error) {
      receiptContextError = error.message;
    }
  }

  const steps = {
    integrated: ["publish"],
    prepared: ["prepare"],
    published: ["publish", "accept"],
    reviewed: ["review"],
  };

  ensure(
    steps[stage]?.includes(nativeRole(context.subject, context.readBead)),
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
    assignee: context.subject.assignee ?? "",
    candidate: context.candidate,
    executorSessionId: context.executor,
    executorSessionName: context.subject.metadata["gc.session_name"],
    integration:
      stage === "integrated" ? integrationArchiveIdentity(context) : null,
    iteration: context.subject.metadata?.["gc.iteration"] ?? "1",
    policy,
    receiptContextError,
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

const rootReceiptNames = [
  "adoption.json",
  "manifest.json",
  "qualified-prepared.json",
  "qualification-decision.json",
  "reviewed.json",
];

const landingReceiptNames = [
  "integrated.json",
  "qualified-integrated.json",
  "published.json",
  "manifest.json",
  "remote-race.json",
];

const checkReceiptSources = (context) => {
  if (context.record.stage === "scanned") {
    return [
      [
        "receipts",
        context.directory,
        ["scan-report.json", "scan-evidence.json"],
      ],
      ["native", context.artifactDirectory, archiveNativeNames],
    ];
  }

  const sources = [
    ["receipts", context.directory, archiveReceiptNames],
    ["native", context.artifactDirectory, archiveNativeNames],
  ];

  if (context.schema !== 2) {
    return sources;
  }

  sources.push(["root-receipts", context.receiptDirectory, rootReceiptNames]);

  try {
    const directory = archiveLandingDirectory(context);

    if (directory) {
      sources.push(["landing-receipts", directory, landingReceiptNames]);
    }
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) {
      throw error;
    }
  }

  return sources;
};

const snapshotCheckEvidence = (context, phase) => {
  const snapshot = checkedDirectory(
    context.archive,
    path.join(context.archive, phase),
    true
  );

  const missing = [];

  for (const [namespace, directory, names] of checkReceiptSources(context)) {
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
    if (value === undefined) {
      continue;
    }

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

const completeLandingManifest = (context, checkManifest) => {
  const pointer = json(
    checkedFile(
      context.artifactDirectory,
      path.join(context.artifactDirectory, "result.json")
    )
  );

  validateBinding(pointer, context);
  const directory = landingDirectory(context, pointer.attempt);
  const names = ["integrated.json", "qualified-integrated.json"];

  const receipts = names.map((name) =>
    json(checkedFile(directory, path.join(directory, name)))
  );

  ensure(
    receipts[0].commit === receipts[1].commit &&
      receipts[0].base === receipts[1].base &&
      receipts[1].attempt === pointer.attempt &&
      receipts[1].mode === "required",
    "Incomplete exact landing qualification"
  );
  ensure(
    checkManifest.exitCode === 0 &&
      checkManifest.integration === receipts[0].commit &&
      checkManifest.hashes["sealed/qualification.log"],
    "Missing durable landing qualification log"
  );

  const hashes = Object.fromEntries(
    names.map((name) => [
      name,
      sha256(readFileSync(checkedFile(directory, path.join(directory, name)))),
    ])
  );

  for (const name of names) {
    ensure(
      hashes[name] === checkManifest.hashes[`after/landing-receipts/${name}`],
      "Landing receipt changed after archival"
    );
  }

  const archiveManifest = path.relative(
    context.directory,
    path.join(context.archive, "manifest.json")
  );

  writeRecord(directory, "manifest.json", {
    ...binding(context),
    attempt: pointer.attempt,
    check: {
      path: archiveManifest,
      sha256: sha256(readFileSync(path.join(context.archive, "manifest.json"))),
    },
    complete: true,
    hashes,
    step: context.subject.id,
  });
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
      ...(stage === "scanned"
        ? ["scan-report.json", "scan-evidence.json"]
        : archiveReceiptNames
      ).map((name) => `${phase}/receipts/${name}`),
      ...archiveNativeNames.map((name) => `${phase}/native/${name}`),
      ...rootReceiptNames.map((name) => `${phase}/root-receipts/${name}`),
      ...landingReceiptNames.map((name) => `${phase}/landing-receipts/${name}`),
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
          "before/root-receipts",
          "after/root-receipts",
          "before/landing-receipts",
          "after/landing-receipts",
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

  if (context.schema === 2 && stage === "integrated" && exitCode === 0) {
    completeLandingManifest(context, manifest);
  }

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

const receiptLocation = (name, context) => {
  if (name === "request") {
    return context.directory;
  }

  if (context.schema !== 2) {
    return context.directory;
  }

  if (["integrated", "qualified-integrated", "published"].includes(name)) {
    return landingDirectory(context, context.pointer.attempt);
  }

  return context.receiptDirectory;
};

const loadReceipt = (name, context) => {
  const directory = receiptLocation(name, context);

  const record = json(
    checkedFile(directory, path.join(directory, `${name}.json`))
  );

  if (context.schema === 2 && name !== "request") {
    validateBinding(record, context);
    ensure(identity.test(record.step), "Missing native receipt step");
    const actor = context.readBead(record.step);
    ensure(
      actor.id === record.step &&
        actor.metadata?.["gc.root_bead_id"] === context.root.id,
      "Foreign native receipt step"
    );

    const role = nativeRole(actor, context.readBead);

    const expected = {
      integrated: "publish",
      published: "publish",
      "qualified-integrated": "publish",
      "qualified-prepared": "prepare",
      reviewed: "review",
    };

    ensure(role === expected[name], "Native receipt role mismatch");
    ensure(
      ["in_progress", "closed"].includes(actor.status) &&
        actor.metadata?.["gc.session_id"],
      "Native receipt executor missing"
    );
    ensure(
      actor.status !== "closed" || actor.metadata?.["gc.outcome"] === "pass",
      "Native receipt step failed"
    );

    if (name === "reviewed") {
      ensure(
        [
          actor.metadata["gc.session_id"],
          actor.metadata["gc.session_name"],
        ].includes(record.reviewer),
        "Review receipt does not match native reviewer"
      );
    }

    if (["integrated", "qualified-integrated", "published"].includes(name)) {
      ensure(
        record.attempt === context.pointer.attempt,
        "Foreign landing qualification"
      );
    }
  }

  return record;
};

const validateSelectedPointer = (stage, context) => {
  const role = nativeRole(context.subject, context.readBead);

  const roles = {
    integrated: ["publish"],
    prepared: ["prepare"],
    published: ["publish", "accept"],
    reviewed: ["review"],
  };

  ensure(roles[stage].includes(role), "Stage differs from native subject");
  ensure(
    Boolean(context.pointer.acceptance) === (role === "accept"),
    "Acceptance selector mismatch"
  );

  const selectedDirectory = ["integrated", "published"].includes(stage)
    ? landingDirectory(context, context.pointer.attempt)
    : context.receiptDirectory;

  const selectedName = stage === "prepared" ? "adoption" : stage;

  const bytes = readFileSync(
    checkedFile(
      selectedDirectory,
      path.join(selectedDirectory, `${selectedName}.json`)
    )
  );

  ensure(
    context.pointer.receiptHash === sha256(bytes),
    "Selected receipt digest changed"
  );
};

const validateArchivedHashes = (context, reference, archived) => {
  const required = Schema.Struct({
    hashes: Schema.Struct({
      "sealed/qualification.log": hashSchema,
      "sealed/stderr.log": hashSchema,
      "sealed/stdout.log": hashSchema,
    }),
  });

  ensure(
    Schema.is(required)(archived),
    "Missing sealed qualification evidence hashes"
  );
  const directory = path.dirname(path.join(context.directory, reference.path));
  checkedDirectory(context.directory, directory);

  for (const [relative, expected] of Object.entries(archived.hashes)) {
    ensure(
      safePath(relative) &&
        Schema.is(hashSchema)(expected) &&
        !["stdout.log", "stderr.log", "qualification.log"].includes(relative),
      "Invalid immutable archive evidence path"
    );
    ensure(
      sha256(
        readFileSync(checkedFile(directory, path.join(directory, relative)))
      ) === expected,
      "Archived evidence digest changed"
    );
  }
};

const validateLandingManifest = (context) => {
  const directory = landingDirectory(context, context.pointer.attempt);

  const manifest = json(
    checkedFile(directory, path.join(directory, "manifest.json"))
  );

  validateBinding(manifest, context);
  const archived = JSON.parse(readEvidence(context, manifest.check));
  validateArchivedHashes(context, manifest.check, archived);
  ensure(
    archived.complete === true &&
      archived.exitCode === 0 &&
      archived.root === context.root.id &&
      archived.candidate === context.candidate &&
      archived.subject === manifest.step &&
      archived.stage === "integrated",
    "Landing check archive does not match attempt"
  );
  ensure(
    manifest.complete === true && manifest.attempt === context.pointer.attempt,
    "Incomplete landing manifest"
  );

  for (const name of ["integrated.json", "qualified-integrated.json"]) {
    ensure(
      manifest.hashes?.[name] ===
        sha256(
          readFileSync(checkedFile(directory, path.join(directory, name)))
        ),
      "Landing manifest digest mismatch"
    );
  }
};

const validateStagePrerequisites = (
  stage,
  context,
  request,
  prepared,
  tree
) => {
  const load = (name) => loadReceipt(name, context);

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
    const preparer =
      context.schema === 2 ? context.authorization.adopter : prepared.preparer;

    ensure(
      (context.ownerIdentities ?? [context.subject.assignee]).includes(
        preparer
      ),
      "Preparer identity mismatch"
    );
  }

  if (stage !== "prepared") {
    const review = load("reviewed");
    validateReview(review, request, prepared, tree);

    if (context.schema === 2) {
      const { adopterIdentity, originalIdentity } =
        preparationIdentities(context);

      const actor = context.readBead(review.step);
      const reviewer = executorIdentity(actor, context.readBead);
      validateIdentityMappings([originalIdentity, adopterIdentity, reviewer]);
      ensure(
        reviewer.id !== adopterIdentity.id &&
          reviewer.id !== originalIdentity.id,
        "Original preparer or adopter cannot independently review"
      );
    }

    if (stage === "reviewed") {
      ensure(
        (context.ownerIdentities ?? [context.subject.assignee]).includes(
          review.reviewer
        ),
        "Reviewer identity mismatch"
      );
    }
  }
};

const validateAcceptanceSelection = (context, publication) => {
  const artifact = path.join(
    path.dirname(context.artifactDirectory),
    publication.step
  );

  const pointer = json(
    checkedFile(artifact, path.join(artifact, "result.json"))
  );

  validateBinding(pointer, context);
  ensure(
    pointer.stage === "published" &&
      pointer.acceptance === false &&
      pointer.step === publication.step &&
      pointer.attempt === context.pointer.attempt &&
      pointer.receiptHash === context.pointer.receiptHash,
    "Acceptance does not select current published attempt"
  );
};

export const checkStage = (stage, context) => {
  ensure(
    ["prepared", "reviewed", "integrated", "published"].includes(stage) &&
      context.pointer.stage === stage,
    "Invalid artifact stage"
  );

  const load = (name) => loadReceipt(name, context);

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

  const prepared =
    context.schema === 2 ? validateAdoption(context) : load("prepared");

  if (context.schema === 2) {
    validateSelectedPointer(stage, context);
  }

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

  validateStagePrerequisites(stage, context, request, prepared, tree);

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

    if (context.schema === 2) {
      validateLandingContents(context, context.pointer.attempt);
      ensure(
        publication.checkout ===
          path.join(
            landingDirectory(context, context.pointer.attempt),
            "checkout"
          ),
        "Landing checkout does not belong to attempt"
      );
      checkedDirectory(context.directory, publication.checkout);
    }

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
    if (context.schema === 2) {
      validateLandingManifest(context);
    }

    const publication = load("published");

    if (context.schema === 2 && context.pointer.acceptance) {
      validateAcceptanceSelection(context, publication);
    }

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

  const result = {
    base: selected.base,
    candidate: request.candidate,
    checkout: selected.checkout,
    commit: selected.commit,
    stage,
    tree: git(selected.checkout, "rev-parse", `${selected.commit}^{tree}`),
  };

  if (context.schema === 2) {
    return {
      ...result,
      ...binding(context),
      attempt: context.pointer.attempt,
      step: context.subject.id,
    };
  }

  return result;
};

export const qualificationDecision = (stage, context) => {
  const result = checkStage(stage, context);

  if (context.schema !== 2 || stage === "integrated") {
    return { mode: "required", result };
  }

  const q = context.authorization.qualification;

  if (q.mode === "required") {
    const historicalPaths = [
      "qualified-prepared.json",
      path.posix.join(
        path.posix.dirname(context.authorization.prepared.path),
        "qualified-prepared.json"
      ),
    ];

    ensure(
      historicalPaths.every(
        (name) => !existsSync(path.join(context.directory, name))
      ),
      "Historical qualification requires explicit provenance approval"
    );
    ensure(
      !q.receipt && !q.log && !q.policy && !q.trustedOrigin,
      "Contradictory required qualification"
    );

    for (const name of [
      "qualified-prepared.json",
      "qualification-decision.json",
    ]) {
      ensure(
        !existsSync(path.join(context.receiptDirectory, name)),
        "Qualification already attempted"
      );
    }

    return { mode: "required", result };
  }

  ensure(
    q.receipt && q.log && q.policy && q.trustedOrigin,
    "Qualification reuse provenance missing"
  );
  const prior = JSON.parse(readEvidence(context, q.receipt));
  readEvidence(context, q.log);
  validateQualification(
    prior,
    result.candidate,
    result.base,
    result.commit,
    result.tree
  );
  ensure(
    digest.test(q.policy) && q.trustedOrigin.trim(),
    "Untrusted qualification reuse"
  );

  return { mode: "reused", provenance: q, result };
};

const validateLandingTransition = (stage, attempt, prior, count, context) => {
  const selectedDirectory = landingDirectory(context, attempt);

  if (prior) {
    const previous = JSON.parse(prior);
    validateBinding(previous, context);
    ensure(
      previous.step === context.subject.id &&
        ((previous.stage === "integrated" &&
          stage === "published" &&
          previous.attempt === attempt) ||
          (previous.stage === "integrated" &&
            stage === "integrated" &&
            attempt === previous.attempt + 1)),
      "Invalid selector transition"
    );

    if (stage === "integrated") {
      const race = json(
        checkedFile(
          selectedDirectory,
          path.join(selectedDirectory, "remote-race.json")
        )
      );

      const old = json(
        checkedFile(
          landingDirectory(context, previous.attempt),
          path.join(
            landingDirectory(context, previous.attempt),
            "integrated.json"
          )
        )
      );

      const next = json(
        checkedFile(
          selectedDirectory,
          path.join(selectedDirectory, "integrated.json")
        )
      );

      ensure(
        race.previousSelector === sha256(prior) &&
          race.previousBase === old.base &&
          race.nextBase === next.base &&
          old.base !== next.base,
        "Missing recorded remote base race"
      );
    }
  } else {
    ensure(
      stage === "accepted" || (stage === "integrated" && attempt === count + 1),
      "Skipped landing attempt"
    );
  }
};

export const selectReceipt = (stage, attempt, expected, context) => {
  ensure(
    ["prepared", "reviewed", "integrated", "published", "accepted"].includes(
      stage
    ),
    "Invalid selection"
  );
  validateAdoption(context);

  const role = nativeRole(context.subject, context.readBead);

  ensure(
    {
      accepted: "accept",
      integrated: "publish",
      prepared: "prepare",
      published: "publish",
      reviewed: "review",
    }[stage] === role,
    "Selector stage differs from claimed role"
  );
  const file = path.join(context.artifactDirectory, "result.json");

  const prior = existsSync(file)
    ? readFileSync(checkedFile(context.artifactDirectory, file))
    : null;

  ensure(
    (prior ? sha256(prior) : "absent") === expected,
    "Selector expected digest mismatch"
  );
  let selectedDirectory = context.receiptDirectory;

  if (["integrated", "published", "accepted"].includes(stage)) {
    selectedDirectory = landingDirectory(context, attempt);
    ensure(attempt > validateLineage(context), "Landing count reset");
  }

  const receiptName = stage === "accepted" ? "published" : stage;

  const receiptBytes =
    stage === "prepared"
      ? readFileSync(
          checkedFile(
            context.receiptDirectory,
            path.join(context.receiptDirectory, "adoption.json")
          )
        )
      : readFileSync(
          checkedFile(
            selectedDirectory,
            path.join(selectedDirectory, `${receiptName}.json`)
          )
        );

  const pointer = {
    ...binding(context),
    acceptance: stage === "accepted",
    attempt,
    receiptHash: sha256(receiptBytes),
    stage: stage === "accepted" ? "published" : stage,
    step: context.subject.id,
  };

  if (prior?.equals(Buffer.from(`${JSON.stringify(pointer)}\n`))) {
    checkStage(pointer.stage, { ...context, pointer });
    context.assertLive();

    return pointer;
  }

  if (["integrated", "published", "accepted"].includes(stage)) {
    validateLandingTransition(
      stage,
      attempt,
      prior,
      validateLineage(context),
      context
    );
  } else {
    ensure(!prior, "Stage selector already exists");
  }

  checkStage(pointer.stage, { ...context, pointer });
  context.assertLive();

  if (prior) {
    writeImmutable(selectedDirectory, `selectors/${sha256(prior)}.json`, prior);
    ensure(
      sha256(readFileSync(checkedFile(context.artifactDirectory, file))) ===
        expected,
      "Selector changed during transition"
    );
    const lock = path.join(context.artifactDirectory, "selector.lock");
    mkdirSync(lock);

    try {
      ensure(
        sha256(readFileSync(checkedFile(context.artifactDirectory, file))) ===
          expected,
        "Selector raced"
      );
      const next = path.join(lock, "result.json");
      writeRecord(lock, "result.json", pointer);
      renameSync(next, file);
    } finally {
      rmSync(lock, { recursive: true });
    }
  } else {
    writeRecord(context.artifactDirectory, "result.json", pointer);
  }

  return pointer;
};

export const recordStage = (stage, attempt, input, context) => {
  ensure(
    ["reviewed", "integrated", "published"].includes(stage),
    "Invalid receipt stage"
  );
  validateAdoption(context);

  const role = nativeRole(context.subject, context.readBead);

  ensure(
    (stage === "reviewed" ? "review" : "publish") === role,
    "Receipt stage differs from claim"
  );
  const record = { ...input, ...binding(context), step: context.subject.id };
  let directory = context.receiptDirectory;

  if (stage === "reviewed") {
    ensure(
      record.reviewer === context.executor,
      "Review must name actual executor"
    );
  } else {
    directory = landingDirectory(context, attempt);
    ensure(attempt > validateLineage(context), "Landing count reset");
    record.attempt = attempt;
  }

  checkedDirectory(context.directory, directory, true);

  if (stage !== "reviewed") {
    validateLandingContents(context, attempt);
  }

  context.assertLive();
  writeRecord(directory, `${stage}.json`, record);

  return record;
};

const assertCheckInvocation = (stage, env, readBead) => {
  const context = archiveContext(stage, env, readBead);

  const started = json(
    checkedFile(context.archive, path.join(context.archive, "started.json"))
  );

  ensure(
    isDeepStrictEqual(started, { ...context.record, complete: false }),
    "Qualification invocation identity changed"
  );
  ensure(
    !existsSync(path.join(context.archive, "exit.json")) &&
      !existsSync(path.join(context.archive, "manifest.json")),
    "Qualification invocation is already terminal"
  );
  checkedFile(context.archive, path.join(context.archive, "stdout.log"));
  checkedFile(context.archive, path.join(context.archive, "stderr.log"));
};

export const reuseQualification = (stage, context) => {
  const decision = qualificationDecision(stage, context);
  ensure(decision.mode === "reused", "Reuse was not authorized");

  const decisionFile = path.join(
    context.receiptDirectory,
    "qualification-decision.json"
  );

  const receiptFile = path.join(
    context.receiptDirectory,
    "qualified-prepared.json"
  );

  ensure(
    existsSync(decisionFile) === existsSync(receiptFile),
    "Incomplete qualification reuse holds"
  );
  ensure(
    isDeepStrictEqual(decision, qualificationDecision(stage, context)),
    "Qualification reuse selection changed"
  );
  writeRecord(context.receiptDirectory, "qualification-decision.json", {
    ...binding(context),
    ...decision,
    installExecuted: false,
    verifyExecuted: false,
  });
  writeRecord(context.receiptDirectory, "qualified-prepared.json", {
    ...decision.result,
    mode: "reused",
  });

  return decision;
};

export const qualifyResult = (stage, result, context) => {
  let receipt = {
    base: result.base,
    candidate: result.candidate,
    commit: result.commit,
    tree: result.tree,
  };

  if (context.schema === 2) {
    receipt = {
      ...receipt,
      ...binding(context),
      attempt: context.pointer.attempt,
      mode: "required",
      step: context.subject.id,
    };
  }

  const directory = receiptLocation(`qualified-${stage}`, context);
  writeRecord(directory, `qualified-${stage}.json`, receipt);
};

export const main = (args, env = process.env) => {
  if (args[0] === "hash" && args.length === 2) {
    return hashDirectory(args[1]);
  }

  if (args[0] === "scan-admission" && args.length === 3) {
    return scanAdmission(args[1], args[2]);
  }

  const lengths = {
    adopt: 1,
    check: 2,
    decision: 2,
    qualify: 3,
    record: 4,
    reuse: 2,
    "scan-check": 1,
    "scan-collect": 2,
    "scan-finalize": 2,
    select: 4,
  };

  const validArchive =
    args[0] === "archive" && { begin: 3, finish: 4 }[args[1]] === args.length;

  ensure(
    validArchive || lengths[args[0]] === args.length,
    "Invalid skill-update command"
  );

  const readBead = (id, store = "rig") => {
    ensure(id && !id.startsWith("-"), "Missing native bead identity");

    const result = spawnSync(
      "gc",
      [
        "--city",
        env.GC_CITY,
        ...(store === "city" ? [] : ["--rig", "personal-site"]),
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

  if (["scan-collect", "scan-finalize", "scan-check"].includes(args[0])) {
    return runScanCommand(args, env, readBead);
  }

  if (args[0] === "archive") {
    return args[1] === "begin"
      ? beginCheckArchive(args[2], env, readBead)
      : JSON.stringify(
          finishCheckArchive(args[2], Number(args[3]), env, readBead)
        );
  }

  if (["adopt", "select", "record"].includes(args[0])) {
    const context = resolveWriteContext(env, readBead, () =>
      command("gc", ["--city", env.GC_CITY, "hook", "current", "--id-only"])
    );

    if (args[0] === "adopt") {
      return JSON.stringify(adoptPreparation(context));
    }

    if (args[0] === "record") {
      return JSON.stringify(
        recordStage(args[1], Number(args[2]), JSON.parse(args[3]), context)
      );
    }

    return JSON.stringify(
      selectReceipt(args[1], Number(args[2]), args[3], context)
    );
  }

  const context = resolveContext(env, readBead);

  if (["decision", "reuse"].includes(args[0])) {
    ensure(
      ["prepared", "integrated"].includes(args[1]),
      "Invalid qualification stage"
    );
    assertCheckInvocation(args[1], env, readBead);

    return JSON.stringify(
      args[0] === "reuse"
        ? reuseQualification(args[1], context)
        : qualificationDecision(args[1], context)
    );
  }

  const result = checkStage(args[1], context);

  if (args[0] === "qualify") {
    ensure(
      ["prepared", "integrated"].includes(args[1]),
      "Invalid qualification stage"
    );
    assertCheckInvocation(args[1], env, readBead);
    ensure(
      isDeepStrictEqual(JSON.parse(args[2]), result),
      "Tree changed during qualification"
    );

    qualifyResult(args[1], result, context);
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
