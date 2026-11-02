import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Schema } from "effect";
import { execa } from "execa";

const verifierPath = "scripts/orchestrator-verify.mjs";
const nonblank = Schema.String.check(Schema.isPattern(/\S/u));
const commit = Schema.String.check(Schema.isPattern(/^[\da-f]{40}$/u));

const relativePath = Schema.String.check(
  Schema.isPattern(
    /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*[\\\0\r\n:])[^/]+(?:\/[^/]+)*$/u
  )
);

const policySchema = Schema.Struct({
  fullVerificationPaths: Schema.NonEmptyArray(relativePath),
  generatedPaths: Schema.Array(relativePath),
  localOnly: Schema.Literal(true),
  protectedPaths: Schema.NonEmptyArray(relativePath),
  timeoutMs: Schema.Number.check(
    Schema.isInt(),
    Schema.isBetween({ maximum: 600_000, minimum: 1 })
  ),
  toolchain: Schema.Struct({ bun: nonblank, node: nonblank }),
  verifierPath: Schema.Literal(verifierPath),
  version: Schema.Literal(1),
});

const requestSchema = Schema.Struct({
  artifactDirectory: nonblank,
  attemptId: nonblank,
  candidateCommit: commit,
  controlCommit: commit,
  dependencyLinks: Schema.Array(
    Schema.Struct({ path: relativePath, source: nonblank })
  ),
  executables: Schema.Struct({ bun: nonblank, git: nonblank, node: nonblank }),
  expectedBase: commit,
  policyPath: relativePath,
  repository: nonblank,
  resultCommit: commit,
  taskId: nonblank,
});

const decode = (schema, value) =>
  Schema.decodeUnknownSync(schema, { onExcessProperty: "error" })(value);

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

const within = (file, directory) =>
  file === directory || file.startsWith(`${directory}${path.sep}`);

const matches = (file, prefixes) =>
  prefixes.some((prefix) => file === prefix || file.startsWith(`${prefix}/`));

const protectedInput = (file, policy, policyPath) =>
  matches(file, [
    ...policy.protectedPaths,
    policyPath,
    "scripts",
    "tools",
    "agent-patterns",
  ]) ||
  file
    .split("/")
    .some(
      (part) =>
        part.startsWith(".") ||
        ["node_modules", "scripts", "tools"].includes(part.toLowerCase())
    ) ||
  /(?:^|\/)(?:package\.json|turbo\.json|content-collections\.[^/]+|[^/]*lock[^/]*|[^/]*config[^/]*|[^/]*rc)$/iu.test(
    file
  );

const environment = (executables) => ({
  CI: "1",
  GIT_CONFIG_GLOBAL: os.devNull,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_NO_REPLACE_OBJECTS: "1",
  GIT_TERMINAL_PROMPT: "0",
  LC_ALL: "C",
  PATH: [
    ...new Set(Object.values(executables).map((file) => path.dirname(file))),
    "/usr/bin",
    "/bin",
  ].join(path.delimiter),
});

const awaitProcessGroupExit = async (pid, deadline) => {
  try {
    process.kill(-pid, 0);
  } catch (error) {
    if (error.code === "ESRCH") {
      return;
    }

    throw error;
  }

  if (performance.now() >= deadline) {
    throw new Error("Verification process group survived cleanup");
  }

  await delay(10);

  return awaitProcessGroupExit(pid, deadline);
};

const releaseProcessGroup = async (subprocess) => {
  if (subprocess.pid === undefined) {
    return;
  }

  subprocess.kill("SIGKILL");

  await awaitProcessGroupExit(subprocess.pid, performance.now() + 1000);
};

const run = async (command, args, options = {}) => {
  const subprocess = execa(command, args, {
    extendEnv: false,
    forceKillAfterDelay: 1000,
    killDescendants: true,
    reject: false,
    shell: false,
    stdin: "ignore",
    timeout: 30_000,
    ...options,
  });

  const result = await subprocess;

  try {
    await releaseProcessGroup(subprocess);

    return { ...result, cleanupError: null };
  } catch (error) {
    return { ...result, cleanupError: error.message, failed: true };
  }
};

const git = async (request, args, cwd = request.repository) => {
  const result = await run(
    request.executables.git,
    ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", ...args],
    {
      cwd,
      env: environment(request.executables),
      stripFinalNewline: args[0] !== "show",
    }
  );

  if (result.failed) {
    throw new Error(
      `git ${args[0]} failed: ${result.shortMessage ?? result.stderr}`
    );
  }

  return result.stdout;
};

const immutableFile = async (file, bytes) => {
  await writeFile(file, bytes, { flag: "wx", mode: 0o400 });

  return { path: file, sha256: digest(bytes) };
};

const settleOperations = async (operations) => {
  const results = await Promise.allSettled(operations);

  return results.map((result) => {
    if (result.status === "rejected") {
      throw result.reason;
    }

    return result.value;
  });
};

const prepareRequest = async (input) => {
  if (process.platform === "win32") {
    throw new Error("Verification requires Unix process-group cleanup");
  }

  const decoded = decode(requestSchema, input);
  const request = { ...decoded, executables: { ...decoded.executables } };
  request.repository = await realpath(request.repository);

  const executableEntries = await settleOperations(
    Object.entries(request.executables).map(async ([name, file]) => {
      if (!path.isAbsolute(file)) {
        throw new Error(`${name} executable must be absolute`);
      }

      const resolved = await realpath(file);

      if (within(resolved, request.repository)) {
        throw new Error(
          `${name} executable must be outside the candidate repository`
        );
      }

      return [name, resolved];
    })
  );

  request.executables = Object.fromEntries(executableEntries);

  const artifactParent = await realpath(request.artifactDirectory);

  if (within(artifactParent, request.repository)) {
    throw new Error("Artifacts must be outside the candidate repository");
  }

  request.artifactDirectory = artifactParent;

  return request;
};

export const verifyCandidate = async (input) => {
  let directory;

  try {
    const request = await prepareRequest(input);
    directory = await mkdtemp(path.join(os.tmpdir(), "orchestrator-control-"));

    const source = await git(request, [
      "show",
      `${request.controlCommit}:${verifierPath}`,
    ]);

    const trustedFile = path.join(directory, "verifier.mjs");
    await immutableFile(trustedFile, source);
    await symlink(
      fileURLToPath(new URL("../node_modules", import.meta.url)),
      path.join(directory, "node_modules"),
      "dir"
    );
    const trusted = await import(pathToFileURL(trustedFile).href);

    return await trusted.executeApproved(request, digest(source));
  } catch (error) {
    return { errors: [error.message], status: "infrastructure_failure" };
  } finally {
    if (directory) {
      await rm(directory, { force: true, recursive: true });
    }
  }
};

const inspectCheckout = async (request, checkout, generatedPaths) => {
  const head = await git(request, ["rev-parse", "HEAD"], checkout);

  const dirty = await git(
    request,
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    checkout
  );

  const ignored = await git(
    request,
    ["ls-files", "--others", "--ignored", "--exclude-standard", "-z"],
    checkout
  );

  const indexFlags = await git(request, ["ls-files", "-v", "-z"], checkout);
  const indexTree = await git(request, ["write-tree"], checkout);

  const expectedTree = await git(
    request,
    ["rev-parse", `${request.resultCommit}^{tree}`],
    checkout
  );

  const hiddenTracked = indexFlags
    .split("\0")
    .filter(Boolean)
    .filter((entry) => !entry.startsWith("H "));

  const untracked = dirty
    .split("\0")
    .filter(Boolean)
    .filter(
      (entry) =>
        !(entry.startsWith("?? ") && matches(entry.slice(3), generatedPaths))
    );

  const relevantIgnored = ignored
    .split("\0")
    .filter(Boolean)
    .filter((file) => !matches(file, generatedPaths));

  if (
    head !== request.resultCommit ||
    indexTree !== expectedTree ||
    hiddenTracked.length ||
    untracked.length ||
    relevantIgnored.length
  ) {
    throw new Error(
      `Contaminated verification checkout: ${JSON.stringify({ head, hiddenTracked, indexTree, relevantIgnored, untracked })}`
    );
  }
};

const checkOutcome = (result) => {
  if (
    result.cleanupError ||
    result.timedOut ||
    result.isCanceled ||
    result.signal ||
    result.isMaxBuffer ||
    result.exitCode === undefined ||
    result.exitCode === 127 ||
    result.exitCode >= 128
  ) {
    return "infrastructure_failure";
  }

  return result.exitCode === 0 ? "passed" : "check_failure";
};

const changedPaths = async (request, base, head) => {
  const output = await git(request, [
    "diff",
    "--no-ext-diff",
    "--no-renames",
    "--no-textconv",
    "--name-only",
    "-z",
    base,
    head,
  ]);

  return output.split("\0").filter(Boolean);
};

const inspectInputs = async (request, policy, report) => {
  const identity = {
    candidateCommit: request.candidateCommit,
    controlCommit: request.controlCommit,
    expectedBase: request.expectedBase,
    resultCommit: request.resultCommit,
  };

  await settleOperations(
    Object.entries(identity).map(async ([key, sha]) => {
      const actual = await git(request, [
        "rev-parse",
        "--verify",
        `${sha}^{commit}`,
      ]);

      if (actual !== sha) {
        throw new Error(`Stale ${key}`);
      }
    })
  );

  const [resultBase, candidateBase] = await settleOperations(
    [request.resultCommit, request.candidateCommit].map((sha) =>
      git(request, ["merge-base", request.expectedBase, sha])
    )
  );

  if (resultBase !== request.expectedBase) {
    throw new Error("Expected base is not an ancestor of the result");
  }

  const [changed, candidateChanged, controlChanges] = await settleOperations([
    changedPaths(request, request.expectedBase, request.resultCommit),
    changedPaths(request, candidateBase, request.candidateCommit),
    changedPaths(request, request.controlCommit, request.resultCommit),
  ]);

  const forbidden = [
    ...new Set([...changed, ...candidateChanged, ...controlChanges]),
  ].filter((file) => protectedInput(file, policy, request.policyPath));

  if (forbidden.length) {
    report.status = "rejected";
    throw new Error(
      `Protected verification inputs changed: ${forbidden.join(", ")}`
    );
  }

  const tree = await git(request, ["ls-tree", "-r", request.resultCommit]);

  if (tree.split("\n").some((entry) => /^(?:120000|160000) /u.test(entry))) {
    report.status = "rejected";
    throw new Error(
      "Symlinks and submodules are not supported verification inputs"
    );
  }

  return { changed, identity: { ...identity, candidateBase } };
};

const inspectToolchain = async (request, policy) => {
  const entries = await settleOperations(
    ["node", "bun"].map(async (name) => {
      const version = await run(request.executables[name], ["--version"], {
        env: environment(request.executables),
      });

      if (version.failed || version.stdout !== policy.toolchain[name]) {
        throw new Error(`Toolchain ${name} does not match approved policy`);
      }

      return [name, version.stdout];
    })
  );

  if (process.version !== policy.toolchain.node) {
    throw new Error("Verifier Node runtime does not match approved policy");
  }

  return {
    ...Object.fromEntries(entries),
    arch: process.arch,
    platform: process.platform,
  };
};

const workspacePackages = async (request, checkout) => {
  const tracked = await git(request, ["ls-files", "-z"], checkout);

  const manifests = tracked
    .split("\0")
    .filter(
      (file) => file === "package.json" || file.endsWith("/package.json")
    );

  const entries = await settleOperations(
    manifests.map(async (file) => {
      const manifest = Schema.decodeUnknownSync(
        Schema.Struct({ name: nonblank })
      )(JSON.parse(await readFile(path.join(checkout, file), "utf-8")));

      return [manifest.name, path.dirname(path.join(checkout, file))];
    })
  );

  if (new Set(entries.map(([name]) => name)).size !== entries.length) {
    throw new Error("Duplicate workspace package names");
  }

  return new Map(entries);
};

const dependencyWorkspace = async (directory, packages) => {
  const bytes = await readFile(
    path.join(directory, "package.json"),
    "utf-8"
  ).catch((error) => {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      return null;
    }

    throw error;
  });

  if (bytes === null) {
    return;
  }

  const manifest = Schema.decodeUnknownSync(Schema.Struct({ name: nonblank }))(
    JSON.parse(bytes)
  );

  return packages.get(manifest.name);
};

const mountDependencies = async (source, destination, packages, scope = "") => {
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });

  const packageRoots = await settleOperations(
    entries
      .filter((entry) => entry.name !== ".bin")
      .map(async (entry) => {
        const from = path.join(source, entry.name);
        const to = path.join(destination, entry.name);

        if (!scope && entry.name.startsWith("@")) {
          if (!entry.isDirectory()) {
            throw new Error("Dependency scope must be an ordinary directory");
          }

          return await mountDependencies(from, to, packages, `${entry.name}/`);
        }

        const workspace =
          packages.get(`${scope}${entry.name}`) ??
          (await dependencyWorkspace(from, packages));

        const target = workspace ?? (await realpath(from));

        await symlink(target, to);

        return workspace !== undefined || entry.name.startsWith(".")
          ? []
          : [target];
      })
  );

  const roots = packageRoots.flat();

  if (!scope && entries.some((entry) => entry.name === ".bin")) {
    const binSource = path.join(source, ".bin");
    const binDestination = path.join(destination, ".bin");
    await mkdir(binDestination);
    const binaries = await readdir(binSource);

    await settleOperations(
      binaries.map(async (name) => {
        const target = await realpath(path.join(binSource, name));

        if (!roots.some((root) => within(target, root))) {
          throw new Error(
            "Dependency executable must resolve inside an external package"
          );
        }

        await symlink(target, path.join(binDestination, name));
      })
    );
  }

  return roots;
};

const linkDependencies = async (
  request,
  policy,
  changed,
  checkoutRoot,
  checkout
) => {
  const packages = await workspacePackages(request, checkout);

  await settleOperations(
    request.dependencyLinks.map(async (link) => {
      const parts = link.path.split("/");

      if (
        parts.at(-1) !== "node_modules" ||
        parts.some((part) => part.startsWith(".")) ||
        parts.slice(0, -1).includes("node_modules") ||
        !path.isAbsolute(link.source) ||
        matches(link.path, changed)
      ) {
        throw new Error(
          "Only external node_modules dependency links are supported"
        );
      }

      const source = await realpath(link.source);

      if (within(source, checkoutRoot)) {
        throw new Error(
          "Dependencies must be coordinator-owned outside candidate checkout"
        );
      }

      const destination = path.join(checkout, link.path);
      await mountDependencies(source, destination, packages);
    })
  );

  return [
    ...policy.generatedPaths,
    ...request.dependencyLinks.map((link) => link.path),
  ];
};

const runChecks = async (
  request,
  policy,
  checkout,
  generatedPaths,
  names,
  report,
  artifact
) => {
  const [name, ...remaining] = names;

  if (name === undefined) {
    return "passed";
  }

  const command = [request.executables.bun, "run", name];

  const result = await run(command[0], command.slice(1), {
    cwd: checkout,
    env: {
      ...environment(request.executables),
      TURBO_SCM_BASE: request.expectedBase,
      TURBO_SCM_HEAD: request.resultCommit,
    },
    maxBuffer: 8 * 1024 * 1024,
    timeout: policy.timeoutMs,
  });

  const logArtifactId = `log-${name}`;
  await artifact(
    logArtifactId,
    `${name.replaceAll(":", "-")}.json`,
    `${JSON.stringify({ cleanupError: result.cleanupError, command, errorCode: result.code ?? null, exitCode: result.exitCode ?? null, isCanceled: result.isCanceled, signal: result.signal ?? null, stderr: result.stderr, stdout: result.stdout, timedOut: result.timedOut })}\n`
  );
  const status = checkOutcome(result);
  report.checks.push({
    cleanupError: result.cleanupError,
    command,
    exitCode: result.exitCode ?? null,
    logArtifactId,
    name,
    signal: result.signal ?? null,
    status,
    timedOut: result.timedOut,
  });
  await inspectCheckout(request, checkout, generatedPaths);

  return status === "passed"
    ? runChecks(
        request,
        policy,
        checkout,
        generatedPaths,
        remaining,
        report,
        artifact
      )
    : status;
};

export const executeApproved = async (input, verifierSha256) => {
  const request = await prepareRequest(input);

  const approvedSource = await git(request, [
    "show",
    `${request.controlCommit}:${verifierPath}`,
  ]);

  const executingSource = await readFile(import.meta.filename);

  if (
    digest(approvedSource) !== verifierSha256 ||
    digest(executingSource) !== verifierSha256
  ) {
    throw new Error(
      "Executing verifier does not match approved control source"
    );
  }

  const directory = await mkdtemp(
    path.join(request.artifactDirectory, "verification-")
  );

  let checkoutRoot;

  const report = {
    artifacts: [],
    checks: [],
    errors: [],
    status: "infrastructure_failure",
    version: 1,
  };

  const artifact = async (id, name, bytes) => {
    const item = {
      id,
      ...(await immutableFile(path.join(directory, name), bytes)),
    };

    report.artifacts.push(item);

    return item;
  };

  try {
    const policyBytes = await git(request, [
      "show",
      `${request.controlCommit}:${request.policyPath}`,
    ]);

    const policy = decode(policySchema, JSON.parse(policyBytes));
    await artifact("policy", "policy.json", policyBytes);
    const { changed, identity } = await inspectInputs(request, policy, report);
    const toolchain = await inspectToolchain(request, policy);

    checkoutRoot = await mkdtemp(
      path.join(os.tmpdir(), "orchestrator-result-")
    );
    const checkout = path.join(checkoutRoot, "checkout");
    await git(
      request,
      [
        "clone",
        "--no-local",
        "--no-checkout",
        "--",
        request.repository,
        checkout,
      ],
      checkoutRoot
    );
    await git(
      request,
      [
        "fetch",
        "--no-tags",
        "--no-write-fetch-head",
        "--",
        request.repository,
        request.resultCommit,
      ],
      checkout
    );
    await git(
      request,
      ["checkout", "--detach", request.resultCommit],
      checkout
    );

    const generatedPaths = await linkDependencies(
      request,
      policy,
      changed,
      checkoutRoot,
      checkout
    );

    await inspectCheckout(request, checkout, generatedPaths);

    const candidateTree = await git(request, [
      "rev-parse",
      `${request.candidateCommit}^{tree}`,
    ]);

    const resultTree = await git(request, [
      "rev-parse",
      `${request.resultCommit}^{tree}`,
    ]);

    report.provenance = {
      ...identity,
      attemptId: request.attemptId,
      candidateTree,
      changedPaths: changed,
      dependencyLinks: request.dependencyLinks,
      executables: request.executables,
      isolation: "local-checkout-only",
      policyPath: request.policyPath,
      policySha256: digest(policyBytes),
      resultTree,
      taskId: request.taskId,
      toolchain,
      verifierCommit: request.controlCommit,
      verifierSha256,
    };

    const names = changed.some((file) =>
      matches(file, policy.fullVerificationPaths)
    )
      ? ["verify", "verify:full"]
      : ["verify"];

    report.status = await runChecks(
      request,
      policy,
      checkout,
      generatedPaths,
      names,
      report,
      artifact
    );

    report.receipt = {
      artifacts: report.artifacts,
      attemptId: request.attemptId,
      baseCommit: request.expectedBase,
      candidateCommit: request.candidateCommit,
      candidateTree,
      checks: report.checks,
      taskId: request.taskId,
      toolchain,
      verifierCommit: request.controlCommit,
    };
  } catch (error) {
    if (report.status !== "rejected") {
      report.status = "infrastructure_failure";
    }

    report.errors.push(error.message);
  } finally {
    if (checkoutRoot) {
      await rm(checkoutRoot, { force: true, recursive: true });
    }
  }

  const reportFile = await immutableFile(
    path.join(directory, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );

  await chmod(directory, 0o500);

  return { ...report, reportArtifact: reportFile };
};

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const report = await verifyCandidate(
    JSON.parse(await readFile(process.argv[2], "utf-8"))
  );

  process.stdout.write(`${JSON.stringify(report)}\n`);
  process.exitCode = report.status === "passed" ? 0 : 1;
}
