import { match as assertMatch } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const origin = "git@github.com:benschac/digitial-garden.git";
const sections = ["dependencies", "devDependencies"];
const stable = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u;

const declaration =
  /^(?<range>\^|~)?(?<version>(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/u;

const json = (file) => JSON.parse(readFileSync(file, "utf-8"));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const save = (file, value) => {
  writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`, {
    flag: "wx",
  });
  renameSync(`${file}.tmp`, file);
};

export const validateRequest = (input) => {
  assert(
    input && Object.getPrototypeOf(input) === Object.prototype,
    "Expected request object"
  );
  assertMatch(input.bead, /^[a-z0-9]+-[a-z0-9]+$/u);
  assertMatch(
    input.package,
    /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u
  );
  assertMatch(input.target, stable);
  assert(path.isAbsolute(input.city), "city must be absolute");
  assert(
    Array.isArray(input.declarations) && input.declarations.length > 0,
    "Expected existing declarations"
  );

  const declarations = input.declarations
    .map((entry) => {
      assert(
        entry && Object.getPrototypeOf(entry) === Object.prototype,
        "Invalid declaration"
      );
      assertMatch(entry.path, /^(?:[a-zA-Z0-9_.-]+\/)*package\.json$/u);
      assert(
        !entry.path
          .split("/")
          .some((part) => part === "." || part === ".." || part === ".git"),
        "Invalid manifest path"
      );
      assert(
        sections.includes(entry.section),
        "Only dependencies and devDependencies qualify"
      );

      assertMatch(entry.from, declaration);
      const match = declaration.exec(entry.from);

      assert(
        match,
        "Old declaration must be exact, caret, or tilde stable version"
      );
      const old = match.groups.version.split(".").map(BigInt);
      const next = input.target.split(".").map(BigInt);
      assert(
        old[0] === next[0] && (old[0] !== 0n || old[1] === next[1]),
        "Potentially breaking upgrade"
      );
      assert(
        next[1] > old[1] || (next[1] === old[1] && next[2] > old[2]),
        "Target must increase the version"
      );

      return {
        from: entry.from,
        path: entry.path,
        section: entry.section,
        to: `${match.groups.range ?? ""}${input.target}`,
      };
    })
    .toSorted((a, b) =>
      `${a.path}:${a.section}`.localeCompare(`${b.path}:${b.section}`)
    );

  assert(
    new Set(declarations.map((entry) => `${entry.path}:${entry.section}`))
      .size === declarations.length,
    "Duplicate declaration"
  );

  return {
    bead: input.bead,
    city: realpathSync(input.city),
    declarations,
    package: input.package,
    target: input.target,
  };
};

const directory = (parent, name) => {
  const destination = path.join(parent, name);

  if (!existsSync(destination)) {
    mkdirSync(destination);
  }

  assert(
    lstatSync(destination).isDirectory() &&
      !lstatSync(destination).isSymbolicLink(),
    `Unsafe directory: ${destination}`
  );
  assert(
    realpathSync(destination) === destination,
    `Directory escapes owner: ${destination}`
  );

  return destination;
};

const regularFile = (root, relative) => {
  const destination = path.join(root, relative);
  assert(
    realpathSync(destination) === destination &&
      lstatSync(destination).isFile(),
    `Unsafe file: ${relative}`
  );

  return destination;
};

export const verificationArguments = (city) => {
  const owner = directory(
    directory(realpathSync(city), ".gc"),
    "dependency-updates"
  );

  const lock = path.join(owner, "verify.lock");

  const descriptor = openSync(
    lock,
    constants.O_CREAT +
      constants.O_RDWR +
      constants.O_NOFOLLOW +
      constants.O_NONBLOCK,
    0o600
  );

  try {
    assert(
      fstatSync(descriptor).isFile(),
      "Verification lock must be a regular file"
    );
    regularFile(owner, "verify.lock");
  } finally {
    closeSync(descriptor);
  }

  return ["--exclusive", "--timeout", "300", lock, "bun", "run", "verify"];
};

const commandRunner = (log, commands) => {
  if (existsSync(log)) {
    regularFile(path.dirname(log), path.basename(log));
  }

  return (command, args, cwd, env = {}) => {
    const started = Date.now();

    const result = spawnSync(command, args, {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, ...env },
      maxBuffer: 32 * 1024 * 1024,
      timeout: 15 * 60 * 1000,
    });

    const record = {
      args,
      command,
      durationMs: Date.now() - started,
      exitCode: result.status,
      signal: result.signal,
    };

    commands.push(record);
    writeFileSync(
      log,
      `${JSON.stringify(record)}\n${result.stdout ?? ""}${result.stderr ?? ""}\n`,
      { flag: "a" }
    );
    assert(
      !result.error && result.status === 0,
      `${command} ${args.join(" ")} failed: ${result.error?.message ?? result.stderr?.trim() ?? result.signal}. See ${log}`
    );

    return result.stdout.trim();
  };
};

const checkScope = (run, clone, base, expected) => {
  assert(
    run("git", ["ls-files", "--others", "--exclude-standard"], clone) === "",
    "Unexpected untracked files"
  );

  const changes = run("git", ["diff", "--name-status", base, "--"], clone)
    .split("\n")
    .filter(Boolean);

  assert(changes.length > 0, "No dependency changes");
  const allowed = new Set(["bun.lock", ...expected.keys()]);

  for (const change of changes) {
    const [status, file] = change.split("\t");
    assert(
      status === "M" && allowed.has(file),
      `Unexpected changed path: ${change}`
    );
    regularFile(clone, file);
  }

  assert(
    run("git", ["diff", "--summary", base, "--"], clone) === "",
    "File modes or types changed"
  );

  for (const [file, manifest] of expected) {
    assert(
      isDeepStrictEqual(json(regularFile(clone, file)), manifest),
      `Unexpected manifest changes: ${file}`
    );
  }

  run("git", ["diff", "--check", base, "--"], clone);
};

const lockData = (run, clone, text) => {
  const file = path.join(path.dirname(clone), "lock-input.jsonc");
  writeFileSync(file, text);

  return JSON.parse(
    run(
      "bun",
      [
        "-e",
        "console.log(JSON.stringify(Bun.JSONC.parse(await Bun.file(process.argv[1]).text())))",
        file,
      ],
      clone
    )
  );
};

const resolution = (lock, workspacePath, name) => {
  const workspace = lock.workspaces[workspacePath];
  assert(workspace, `Missing lock workspace: ${workspacePath}`);

  const candidates = workspacePath
    ? [`${workspace.name}/${name}`, name]
    : [name];

  const key = candidates.find((candidate) =>
    Object.hasOwn(lock.packages, candidate)
  );

  assert(key, `Missing direct resolution: ${name}`);

  return lock.packages[key];
};

const resolvedVersions = (lock, request) =>
  request.declarations.map((entry) => {
    const workspacePath =
      entry.path === "package.json" ? "" : path.posix.dirname(entry.path);

    const [resolved] = resolution(lock, workspacePath, request.package);
    assert(
      resolved.startsWith(`${request.package}@`),
      "Unsupported selected resolution"
    );
    assertMatch(resolved, /^.+@\d+\.\d+\.\d+$/u);
    const version = resolved.slice(request.package.length + 1);
    assert(stable.test(version), "Selected resolution is not stable");
    const old = version.split(".").map(BigInt);
    const next = request.target.split(".").map(BigInt);
    assert(
      old[0] === next[0] && (old[0] !== 0n || old[1] === next[1]),
      "Resolved version would cross breaking boundary"
    );
    assert(
      next[1] > old[1] || (next[1] === old[1] && next[2] > old[2]),
      "Target does not increase resolved version"
    );

    return version;
  });

const checkDirectResolutions = (before, after, request) => {
  const packageName = request.package;
  assert(
    before &&
      after &&
      before.workspaces &&
      after.workspaces &&
      before.packages &&
      after.packages,
    "Unsupported bun.lock shape"
  );
  const expected = structuredClone(before.workspaces);

  for (const entry of request.declarations) {
    const workspacePath =
      entry.path === "package.json" ? "" : path.posix.dirname(entry.path);

    assert(
      expected[workspacePath]?.[entry.section]?.[packageName] === entry.from,
      "Lock declaration does not match request"
    );
    expected[workspacePath][entry.section][packageName] = entry.to;
    assert(
      resolution(after, workspacePath, packageName)[0] ===
        `${packageName}@${request.target}`,
      "Selected package did not resolve to exact target"
    );
  }

  assert(
    isDeepStrictEqual(expected, after.workspaces),
    "Unrelated lock workspace changes"
  );

  for (const [workspacePath, workspace] of Object.entries(before.workspaces)) {
    for (const section of [
      ...sections,
      "optionalDependencies",
      "peerDependencies",
    ]) {
      for (const name of Object.keys(workspace[section] ?? {})) {
        if (name === packageName) {
          continue;
        }

        assert(
          isDeepStrictEqual(
            resolution(before, workspacePath, name),
            resolution(after, workspacePath, name)
          ),
          `Unrelated direct resolution changed: ${name}`
        );
      }
    }
  }
};

export const prepareDependency = (input) => {
  const request = validateRequest(input);

  let owner = request.city;

  for (const name of [".gc", "dependency-updates", request.bead]) {
    owner = directory(owner, name);
  }

  const attempt = path.join(owner, "prepare-script");
  const resultFile = path.join(attempt, "result.json");
  const clone = path.join(attempt, "checkout");

  if (existsSync(attempt)) {
    directory(owner, "prepare-script");
    const result = json(regularFile(attempt, "result.json"));
    assert(
      result.status === "prepared",
      "Existing attempt is incomplete or failed; preserve it for review"
    );
    assert(
      isDeepStrictEqual(result.request, request),
      "Existing attempt belongs to another request"
    );
    directory(attempt, "checkout");
    const run = commandRunner(path.join(attempt, "replay.log"), []);
    assert(
      run("git", ["remote", "get-url", "origin"], clone) === origin,
      "Origin mismatch"
    );
    assert(
      run("git", ["rev-parse", "HEAD"], clone) === result.commit,
      "Prepared HEAD changed"
    );
    assert(
      run("git", ["rev-parse", "HEAD^"], clone) === result.base,
      "Prepared parent changed"
    );
    assert(
      run("git", ["rev-parse", "HEAD^{tree}"], clone) === result.tree,
      "Prepared tree changed"
    );
    assert(
      run("git", ["status", "--porcelain", "--untracked-files=all"], clone) ===
        "",
      "Prepared clone is dirty"
    );

    return result;
  }

  mkdirSync(attempt);
  const commands = [];

  const result = {
    clone,
    commands,
    request,
    reviewRequired: [
      "release-notes",
      "engines-and-peers",
      "transitive-lock-diff",
    ],
    status: "running",
  };

  save(resultFile, result);
  const run = commandRunner(path.join(attempt, "commands.log"), commands);

  try {
    run(
      "git",
      ["clone", "--single-branch", "--branch", "main", "--", origin, clone],
      attempt
    );
    assert(
      run("git", ["remote", "get-url", "origin"], clone) === origin,
      "Origin mismatch"
    );
    result.base = run("git", ["rev-parse", "HEAD"], clone);
    assert(
      result.base === run("git", ["rev-parse", "origin/main"], clone),
      "Clone is not at origin/main"
    );
    assert(
      run("git", ["status", "--porcelain", "--untracked-files=all"], clone) ===
        "",
      "Fresh clone is dirty"
    );
    const root = json(regularFile(clone, "package.json"));
    assertMatch(root.packageManager, /^bun@\d+\.\d+\.\d+$/u);
    assert(
      run("bun", ["--version"], clone) === root.packageManager.slice(4),
      "Installed Bun does not match packageManager"
    );
    const sources = json(regularFile(clone, "scripts/agent-sources.json"));
    assert(
      Array.isArray(sources) &&
        !sources.some((source) =>
          source.packages?.some((pkg) => pkg.name === request.package)
        ),
      "Package is source-pinned"
    );

    const manifests = run("git", ["ls-files", "-z"], clone)
      .split("\0")
      .filter(
        (file) => file === "package.json" || file.endsWith("/package.json")
      );

    const expected = new Map();
    const found = [];

    for (const file of manifests) {
      const manifest = json(regularFile(clone, file));

      for (const section of [
        "peerDependencies",
        "optionalDependencies",
        "overrides",
        "resolutions",
      ]) {
        assert(
          !JSON.stringify(manifest[section] ?? {}).includes(
            `"${request.package}"`
          ),
          `Unsupported ${section} declaration in ${file}`
        );
      }

      for (const section of sections) {
        if (!Object.hasOwn(manifest[section] ?? {}, request.package)) {
          continue;
        }

        const requested = request.declarations.find(
          (entry) => entry.path === file && entry.section === section
        );

        assert(
          requested && manifest[section][request.package] === requested.from,
          `Stale or missing declaration: ${file}:${section}`
        );
        found.push(requested);
        manifest[section][request.package] = requested.to;
        expected.set(file, manifest);
      }
    }

    assert(
      found.length === request.declarations.length,
      "Request contains missing declarations"
    );
    save(resultFile, result);

    const oldLock = lockData(
      run,
      clone,
      readFileSync(regularFile(clone, "bun.lock"), "utf-8")
    );

    result.oldResolvedVersions = [
      ...new Set(resolvedVersions(oldLock, request)),
    ].toSorted();
    save(resultFile, result);

    for (const [file, manifest] of expected) {
      writeFileSync(
        path.join(clone, file),
        `${JSON.stringify(manifest, null, 2)}\n`
      );
    }

    run("bun", ["install", "--ignore-scripts"], clone);
    checkScope(run, clone, result.base, expected);
    checkDirectResolutions(
      oldLock,
      lockData(
        run,
        clone,
        readFileSync(regularFile(clone, "bun.lock"), "utf-8")
      ),
      request
    );
    run("bun", ["install", "--frozen-lockfile", "--ignore-scripts"], clone);
    run("flock", verificationArguments(request.city), clone, {
      TURBO_SCM_BASE: "HEAD",
      TURBO_SCM_HEAD: "HEAD",
    });
    checkScope(run, clone, result.base, expected);
    checkDirectResolutions(
      oldLock,
      lockData(
        run,
        clone,
        readFileSync(regularFile(clone, "bun.lock"), "utf-8")
      ),
      request
    );
    const versions = result.oldResolvedVersions.join(", ");
    result.subject = `chore(deps): bump ${request.package} from ${versions} to ${request.target}`;
    run("git", ["add", "--", ...expected.keys(), "bun.lock"], clone);
    run("git", ["diff", "--cached", "--check"], clone);
    run("git", ["commit", "-m", result.subject], clone);
    result.commit = run("git", ["rev-parse", "HEAD"], clone);
    result.tree = run("git", ["rev-parse", "HEAD^{tree}"], clone);
    assert(
      run("git", ["rev-parse", "HEAD^"], clone) === result.base,
      "Expected exactly one dependency commit"
    );
    assert(
      run("git", ["status", "--porcelain", "--untracked-files=all"], clone) ===
        "",
      "Commit left dirty files"
    );
    checkScope(run, clone, result.base, expected);
    checkDirectResolutions(
      oldLock,
      lockData(
        run,
        clone,
        readFileSync(regularFile(clone, "bun.lock"), "utf-8")
      ),
      request
    );
    result.status = "prepared";
    save(resultFile, result);

    return result;
  } catch (error) {
    result.status = "failed";
    result.error = error.message;
    save(resultFile, result);
    throw error;
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    assert(
      process.argv.length === 3,
      "Usage: node scripts/dependency-prepare.mjs /absolute/request.json"
    );
    assert(path.isAbsolute(process.argv[2]), "Request path must be absolute");
    console.log(
      JSON.stringify(prepareDependency(json(process.argv[2])), null, 2)
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
