import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const json = (file) => JSON.parse(readFileSync(file, "utf-8"));
const revision = /^[a-f0-9]{40}$/u;
const digest = /^[a-f0-9]{64}$/u;
const identity = /^[a-z0-9]+-[a-z0-9]+$/u;

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

export const resolveContext = (env, readBead) => {
  ensure(
    env.GC_CITY && env.GC_BEAD_ID && env.GC_ARTIFACT_DIR,
    "Missing native check context"
  );
  const subject = readBead(env.GC_BEAD_ID);
  const root = readBead(subject.metadata?.["gc.root_bead_id"]);
  const convoy = readBead(root.metadata?.["gc.input_convoy_id"]);
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

  const anchor = readBead(candidate);
  const directory = path.join(env.GC_CITY, ".gc", "skill-updates", candidate);
  contained(path.join(env.GC_CITY, ".gc", "skill-updates"), directory);
  const pointer = json(path.join(env.GC_ARTIFACT_DIR, "result.json"));
  ensure(pointer.candidate === candidate, "Outcome pointer candidate mismatch");

  return { anchor, candidate, directory, pointer, subject };
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
