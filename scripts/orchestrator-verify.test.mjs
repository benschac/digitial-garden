import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { validateEvidence } from "./orchestrator-evidence.mjs";
import { verifyCandidate } from "./orchestrator-verify.mjs";

const executables = {
  bun: execFileSync("which", ["bun"], { encoding: "utf-8" }).trim(),
  git: "/usr/bin/git",
  node: process.execPath,
};

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

const remove = async (directory) => {
  const artifacts = path.join(directory, "artifacts");
  const names = await readdir(artifacts);

  await Promise.all(
    names.map((name) => chmod(path.join(artifacts, name), 0o700))
  );
  await rm(directory, { force: true, recursive: true });
};

const fixture = async (context, options = {}) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "verifier-test-"));
  context.after(() => remove(directory));
  const repository = path.join(directory, "repository");
  const artifactDirectory = path.join(directory, "artifacts");
  await mkdir(repository);
  await mkdir(artifactDirectory);

  const git = (...args) =>
    execFileSync(executables.git, args, {
      cwd: repository,
      encoding: "utf-8",
      env: {
        ...process.env,
        GIT_CONFIG_GLOBAL: os.devNull,
        GIT_CONFIG_NOSYSTEM: "1",
      },
    }).trim();

  git("init", "-q");
  git("config", "user.name", "Verifier fixture");
  git("config", "user.email", "verifier@example.invalid");

  const put = async (file, value) => {
    await mkdir(path.dirname(path.join(repository, file)), { recursive: true });
    await writeFile(path.join(repository, file), value);
  };

  const commit = (message) => {
    git("add", ".");
    git("commit", "-qm", message);

    return git("rev-parse", "HEAD");
  };

  await put(
    "scripts/orchestrator-verify.mjs",
    await readFile(new URL("orchestrator-verify.mjs", import.meta.url))
  );
  await put(
    "package.json",
    JSON.stringify({
      name: "verification-fixture",
      private: true,
      scripts: {
        verify: "node scripts/check.mjs",
        "verify:full": "node scripts/full.mjs",
      },
    })
  );
  await put(
    "scripts/check.mjs",
    options.check ??
      'import fs from "node:fs"; const value=fs.readFileSync("src/value.txt","utf-8"); console.log("checked:" + value); process.exitCode=value === "fail" ? 1 : 0;'
  );
  await put("scripts/full.mjs", 'console.log("full gate ran");');
  await put("src/value.txt", "base");
  await put(
    "policy.json",
    JSON.stringify({
      fullVerificationPaths: ["build"],
      generatedPaths: options.generatedPaths ?? [],
      localOnly: true,
      protectedPaths: ["checks"],
      timeoutMs: options.timeoutMs ?? 5000,
      toolchain: {
        bun: execFileSync(executables.bun, ["--version"], {
          encoding: "utf-8",
        }).trim(),
        node: process.version,
      },
      verifierPath: "scripts/orchestrator-verify.mjs",
      version: 1,
      ...options.policy,
    })
  );
  const controlCommit = commit("approved control");
  await put("src/value.txt", "pass");
  const candidateCommit = commit("candidate");

  const request = {
    artifactDirectory,
    attemptId: "attempt-1",
    candidateCommit,
    controlCommit,
    dependencyLinks: [],
    executables,
    expectedBase: controlCommit,
    policyPath: "policy.json",
    repository,
    resultCommit: candidateCommit,
    taskId: "B2-fixture",
  };

  return {
    artifactDirectory,
    commit,
    directory,
    git,
    put,
    repository,
    request,
  };
};

test("passing candidate binds actual result tree, approved inputs, logs and B1b receipt", async (context) => {
  const f = await fixture(context);
  await f.put("src/result.txt", "combined result");
  f.request.resultCommit = f.commit("actual result");
  const report = await verifyCandidate(f.request);
  assert.equal(report.status, "passed", JSON.stringify(report));
  assert.equal(report.provenance.candidateCommit, f.request.candidateCommit);
  assert.equal(report.provenance.resultCommit, f.request.resultCommit);
  assert.equal(
    report.provenance.resultTree,
    f.git("rev-parse", `${f.request.resultCommit}^{tree}`)
  );
  assert.notEqual(
    report.provenance.resultTree,
    report.provenance.candidateTree
  );
  assert.equal(report.provenance.verifierCommit, f.request.controlCommit);
  assert.equal(report.checks.length, 1);
  assert.deepEqual(report.checks[0].command.slice(1), ["run", "verify"]);
  assert.equal(validateEvidence(report.receipt, report.receipt).ok, true);

  await Promise.all(
    [...report.artifacts, report.reportArtifact].map(async (artifact) => {
      assert.equal(hash(await readFile(artifact.path)), artifact.sha256);
      assert.equal(artifact.path.startsWith(f.repository), false);
    })
  );

  const log = JSON.parse(
    await readFile(
      report.artifacts.find((item) => item.id === "log-verify").path
    )
  );

  assert.match(log.stdout, /checked:pass/u);
  assert.equal(log.exitCode, 0);
  assert.equal(f.git("status", "--porcelain"), "");
});

test("nonzero verification is a check failure with retained output", async (context) => {
  const f = await fixture(context);
  await f.put("src/value.txt", "fail");
  f.request.resultCommit = f.commit("failing result");
  const report = await verifyCandidate(f.request);
  assert.equal(report.status, "check_failure", JSON.stringify(report));
  assert.equal(report.checks[0].exitCode, 1);
  assert.equal(validateEvidence(report.receipt, report.receipt).ok, false);
  assert.match(
    await readFile(report.artifacts.at(-1).path, "utf-8"),
    /checked:fail/u
  );
});

test("build changes require both verify and full verification", async (context) => {
  const f = await fixture(context);
  await f.put("build/source.txt", "build change");
  f.request.resultCommit = f.commit("build result");
  const report = await verifyCandidate(f.request);
  assert.equal(report.status, "passed", JSON.stringify(report));
  assert.deepEqual(
    report.checks.map((check) => check.name),
    ["verify", "verify:full"]
  );
});

test("candidate verifier, manifests, policy and transitive gates cannot authorize themselves", async (context) => {
  await Promise.all(
    [
      "scripts/orchestrator-verify.mjs",
      "package.json",
      "policy.json",
      "tools/lint-plugin.mjs",
      "apps/web/turbo.json",
    ].map(async (file) => {
      const f = await fixture(context);
      await f.put(
        file,
        file === "scripts/orchestrator-verify.mjs"
          ? 'throw new Error("untrusted verifier executed");'
          : "candidate gate"
      );
      f.request.candidateCommit = f.commit("altered gate");
      f.request.resultCommit = f.request.candidateCommit;
      const report = await verifyCandidate(f.request);
      assert.equal(report.status, "rejected", JSON.stringify(report));
      assert.match(report.errors[0], /Protected verification inputs changed/u);
      assert.equal(report.checks.length, 0);
    })
  );
});

test("changed control gate is rejected even if candidate base already contains it", async (context) => {
  const f = await fixture(context);
  await f.put("scripts/check.mjs", "process.exit(0)");
  f.request.expectedBase = f.commit("unapproved gate base");
  await f.put("src/value.txt", "fail");
  f.request.resultCommit = f.commit("candidate after changed base");
  f.request.candidateCommit = f.request.resultCommit;
  const report = await verifyCandidate(f.request);
  assert.equal(report.status, "rejected");
});

test("tracked and relevant untracked contamination invalidate passing commands", async (context) => {
  await Promise.all(
    ["src/value.txt", "src/missing-code.mjs", "ignored-code.mjs"].map(
      async (file) => {
        const f = await fixture(context, {
          check: `import fs from "node:fs"; fs.writeFileSync(${JSON.stringify(file)}, "contaminated"); console.log("passed but dirty");`,
        });

        const report = await verifyCandidate(f.request);
        assert.equal(
          report.status,
          "infrastructure_failure",
          JSON.stringify(report)
        );
        assert.match(report.errors[0], /Contaminated verification checkout/u);
      }
    )
  );
});

test("ignored source contamination is checked while declared generated output is allowed", async (context) => {
  await Promise.all(
    [false, true].map(async (generated) => {
      const f = await fixture(context, {
        check:
          'import fs from "node:fs"; fs.mkdirSync("output"); fs.writeFileSync("output/artifact.txt", "generated");',
        generatedPaths: generated ? ["output"] : [],
      });

      f.git("checkout", "--detach", f.request.controlCommit);
      await f.put(".gitignore", "output/\n");
      f.request.controlCommit = f.commit("approved ignored output");
      f.request.expectedBase = f.request.controlCommit;
      await f.put("src/value.txt", "pass");
      f.request.candidateCommit = f.commit("candidate with ignored output");
      f.request.resultCommit = f.request.candidateCommit;
      const report = await verifyCandidate(f.request);
      assert.equal(
        report.status,
        generated ? "passed" : "infrastructure_failure",
        JSON.stringify(report)
      );
    })
  );
});

test("timeout and signal are infrastructure failures rather than failed tests", async (context) => {
  await Promise.all(
    [
      "setInterval(() => {}, 1000);",
      'process.kill(process.pid, "SIGTERM");',
    ].map(async (check) => {
      const f = await fixture(context, { check, timeoutMs: 100 });
      const report = await verifyCandidate(f.request);
      assert.equal(
        report.status,
        "infrastructure_failure",
        JSON.stringify(report)
      );
      assert.equal(report.checks[0].status, "infrastructure_failure");
    })
  );
});

test("missing and stale inputs fail closed without executing candidate checks", async (context) => {
  const f = await fixture(context);

  await Promise.all(
    [
      { attemptId: "" },
      { expectedBase: "0".repeat(40) },
      { resultCommit: "0".repeat(40) },
      { controlCommit: "0".repeat(40) },
      { policyPath: "missing.json" },
      { policyPath: "../policy.json" },
      { artifactDirectory: f.repository },
    ].map(async (change) => {
      const report = await verifyCandidate({ ...f.request, ...change });
      assert.equal(
        report.status,
        "infrastructure_failure",
        JSON.stringify(report)
      );
      assert.notEqual(report.errors.length, 0);
    })
  );
});

test("unknown policy options, toolchain drift and symlink inputs fail closed", async (context) => {
  await Promise.all(
    [
      { shell: true },
      { localOnly: false },
      { toolchain: { bun: "stale", node: "stale" } },
    ].map(async (policy) => {
      const f = await fixture(context, { policy });
      const report = await verifyCandidate(f.request);
      assert.equal(
        report.status,
        "infrastructure_failure",
        JSON.stringify(report)
      );
      assert.equal(report.checks.length, 0);
    })
  );

  const f = await fixture(context);
  f.git(
    "update-index",
    "--add",
    "--cacheinfo",
    `120000,${f.git("hash-object", "-w", "src/value.txt")},alias`
  );
  f.git("commit", "-qm", "symlink input");
  f.request.resultCommit = f.git("rev-parse", "HEAD");
  const report = await verifyCandidate(f.request);
  assert.equal(report.status, "rejected");
});

test("tracked modifications cannot hide behind index flags or staged content", async (context) => {
  await Promise.all(
    ["--assume-unchanged", "--skip-worktree", "stage"].map(async (flag) => {
      const check =
        flag === "stage"
          ? 'import fs from "node:fs"; import {execFileSync} from "node:child_process"; fs.writeFileSync("src/value.txt", "dirty"); execFileSync("git", ["add", "src/value.txt"]);'
          : `import fs from "node:fs"; import {execFileSync} from "node:child_process"; execFileSync("git", ["update-index", "${flag}", "src/value.txt"]); fs.writeFileSync("src/value.txt", "dirty");`;

      const f = await fixture(context, { check });
      const report = await verifyCandidate(f.request);
      assert.equal(
        report.status,
        "infrastructure_failure",
        JSON.stringify(report)
      );
      assert.match(report.errors[0], /Contaminated verification checkout/u);
    })
  );
});

test("spawn failures retain infrastructure diagnostics and never mint a successful receipt", async (context) => {
  const f = await fixture(context);
  const executable = path.join(f.directory, "ephemeral-bun");
  await writeFile(
    executable,
    '#!/bin/sh\nif [ "$1" = "--version" ]; then echo "1.4.3"; /bin/rm "$0"; exit 0; fi\n'
  );
  await chmod(executable, 0o700);

  const report = await verifyCandidate({
    ...f.request,
    executables: { ...executables, bun: executable },
  });

  assert.equal(report.status, "infrastructure_failure", JSON.stringify(report));

  const log = JSON.parse(
    await readFile(
      report.artifacts.find((item) => item.id === "log-verify").path,
      "utf-8"
    )
  );

  assert.equal(log.errorCode, "ENOENT");
  assert.equal(log.exitCode, null);
  assert.equal(validateEvidence(report.receipt, report.receipt).ok, false);
});

test("source checkout dirt cannot supply missing code to isolated checks", async (context) => {
  const f = await fixture(context, {
    check:
      'import fs from "node:fs"; process.exitCode=fs.existsSync("uncommitted.mjs") ? 0 : 1;',
  });

  await f.put("uncommitted.mjs", "local-only missing input");
  const report = await verifyCandidate(f.request);
  assert.equal(report.status, "check_failure", JSON.stringify(report));
  assert.match(f.git("status", "--porcelain"), /uncommitted.mjs/u);
});

test("approved source hash is exact and direct unapproved execution is refused", async (context) => {
  const f = await fixture(context);
  const report = await verifyCandidate(f.request);
  assert.equal(
    report.provenance.verifierSha256,
    hash(await readFile(new URL("orchestrator-verify.mjs", import.meta.url)))
  );
  const { executeApproved } = await import("./orchestrator-verify.mjs");
  await assert.rejects(
    executeApproved(f.request, "0".repeat(64)),
    /does not match approved control source/u
  );
});

test("coordinator dependency links are limited to node_modules and cannot overlap metadata", async (context) => {
  const f = await fixture(context);
  const source = path.join(f.directory, "dependencies");
  await mkdir(source);
  await writeFile(path.join(source, "fixture.txt"), "trusted dependency");

  const allowed = await verifyCandidate({
    ...f.request,
    dependencyLinks: [{ path: "node_modules", source }],
  });

  assert.equal(allowed.status, "passed", JSON.stringify(allowed));
  await Promise.all(
    [
      ".git/node_modules",
      "src",
      "node_modules/nested/node_modules",
      "apps/../node_modules",
    ].map(async (destination) => {
      const report = await verifyCandidate({
        ...f.request,
        dependencyLinks: [{ path: destination, source }],
      });

      assert.equal(
        report.status,
        "infrastructure_failure",
        JSON.stringify(report)
      );
    })
  );
  assert.deepEqual(await readdir(source), ["fixture.txt"]);
});

for (const installedName of ["@fixture/package", "workspace-alias"]) {
  test(`workspace dependency ${installedName} resolves to the verified result rather than dirty source`, async (context) => {
    const f = await fixture(context, {
      check: `import value from "${installedName}"; console.log(value); process.exitCode=value === "candidate" ? 0 : 1;`,
    });

    await f.put(
      "packages/fixture/package.json",
      JSON.stringify({ exports: "./index.mjs", name: "@fixture/package" })
    );
    await f.put("packages/fixture/index.mjs", 'export default "base";');
    f.request.controlCommit = f.commit("approved workspace manifest");
    f.request.expectedBase = f.request.controlCommit;
    await f.put("packages/fixture/index.mjs", 'export default "candidate";');
    f.request.candidateCommit = f.commit("workspace candidate");
    f.request.resultCommit = f.request.candidateCommit;
    await f.put(
      "packages/fixture/index.mjs",
      'export default "dirty original";'
    );
    const source = path.join(f.directory, "dependencies");
    await mkdir(path.join(source, "@fixture"), { recursive: true });
    await symlink(
      path.join(f.repository, "packages/fixture"),
      path.join(source, installedName)
    );

    const report = await verifyCandidate({
      ...f.request,
      dependencyLinks: [{ path: "node_modules", source }],
    });

    assert.equal(report.status, "passed", JSON.stringify(report));
    assert.match(
      await readFile(
        report.artifacts.find((artifact) => artifact.id === "log-verify").path,
        "utf-8"
      ),
      /candidate/u
    );
    assert.match(
      await readFile(
        path.join(f.repository, "packages/fixture/index.mjs"),
        "utf-8"
      ),
      /dirty original/u
    );
  });
}

test("frozen coordinator inputs remain unchanged", async (context) => {
  const f = await fixture(context);

  const request = Object.freeze({
    ...f.request,
    dependencyLinks: Object.freeze([]),
    executables: Object.freeze({ ...executables }),
  });

  const before = JSON.stringify(request);
  const report = await verifyCandidate(request);
  assert.equal(report.status, "passed", JSON.stringify(report));
  assert.equal(JSON.stringify(request), before);
});

test("fresh verification binds a rebased result while preserving original candidate attribution", async (context) => {
  const f = await fixture(context);
  f.git("checkout", "--detach", f.request.expectedBase);
  await f.put("src/target.txt", "new target tip");
  f.request.expectedBase = f.commit("target advanced");
  await f.put("src/value.txt", "pass");
  f.request.resultCommit = f.commit("rebased actual result");
  const report = await verifyCandidate(f.request);
  assert.equal(report.status, "passed", JSON.stringify(report));
  assert.equal(report.provenance.candidateCommit, f.request.candidateCommit);
  assert.equal(report.provenance.expectedBase, f.request.expectedBase);
  assert.equal(report.provenance.resultCommit, f.request.resultCommit);
  assert.equal(report.provenance.candidateBase, f.request.controlCommit);
});

test("candidate-owned executables cannot become trusted tools", async (context) => {
  const f = await fixture(context);
  const executable = path.join(f.repository, "candidate-bun");
  await writeFile(executable, "candidate-owned executable");

  const report = await verifyCandidate({
    ...f.request,
    executables: { ...executables, bun: executable },
  });

  assert.equal(report.status, "infrastructure_failure", JSON.stringify(report));
  assert.match(report.errors[0], /executable must be outside/u);
});

test("settled checks release ordinary background descendants before returning", async (context) => {
  await Promise.all(
    [
      { ending: "", outcome: "passed" },
      { ending: "process.exitCode=1;", outcome: "check_failure" },
      {
        ending: "setInterval(() => {}, 1000);",
        outcome: "infrastructure_failure",
      },
    ].map(async ({ ending, outcome }) => {
      const f = await fixture(context, {
        check: `import {spawn} from "node:child_process"; const child=spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {stdio:"ignore"}); child.unref(); console.log("descendant:" + child.pid); ${ending}`,
        timeoutMs: 500,
      });

      const report = await verifyCandidate(f.request);

      const log = JSON.parse(
        await readFile(
          report.artifacts.find((item) => item.id === "log-verify").path,
          "utf-8"
        )
      );

      const pid = Number(
        /descendant:(?<pid>\d+)/u.exec(log.stdout)?.groups.pid
      );

      assert.ok(Number.isInteger(pid) && pid > 0, JSON.stringify(log));
      context.after(() => {
        try {
          process.kill(pid, "SIGKILL");
        } catch (error) {
          if (error.code !== "ESRCH") {
            throw error;
          }
        }
      });
      assert.equal(report.status, outcome, JSON.stringify(report));
      assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
    })
  );
});

test("unreferenced commit-tree results are transported without changing coordinator refs", async (context) => {
  const f = await fixture(context);
  await f.put("src/value.txt", "fail");
  f.git("add", "src/value.txt");
  const resultTree = f.git("write-tree");
  f.request.resultCommit = f.git(
    "commit-tree",
    resultTree,
    "-p",
    f.request.candidateCommit,
    "-m",
    "unreferenced result"
  );
  const refs = f.git("show-ref");
  const report = await verifyCandidate(f.request);
  assert.equal(report.status, "check_failure", JSON.stringify(report));
  assert.equal(report.provenance.resultTree, resultTree);
  assert.equal(report.provenance.resultCommit, f.request.resultCommit);
  assert.equal(f.git("show-ref"), refs);
});

test("result commits reachable only from a detached linked worktree are transported", async (context) => {
  const f = await fixture(context);
  const linked = path.join(f.directory, "linked");
  f.git("worktree", "add", "--detach", linked, f.request.candidateCommit);
  await writeFile(path.join(linked, "src/value.txt"), "fail");
  f.git("-C", linked, "add", "src/value.txt");
  f.git("-C", linked, "commit", "-qm", "detached result");
  f.request.resultCommit = f.git("-C", linked, "rev-parse", "HEAD");
  const refs = f.git("show-ref");
  const report = await verifyCandidate(f.request);
  assert.equal(report.status, "check_failure", JSON.stringify(report));
  assert.equal(report.provenance.resultCommit, f.request.resultCommit);
  assert.equal(f.git("show-ref"), refs);
});

test("symlinked dependency scopes cannot execute dirty original workspace code", async (context) => {
  const f = await fixture(context, {
    check:
      'import value from "@fixture/package"; process.exitCode=value === "dirty original" ? 0 : 1;',
  });

  await f.put(
    "packages/fixture/package.json",
    JSON.stringify({ exports: "./index.mjs", name: "@fixture/package" })
  );
  await f.put("packages/fixture/index.mjs", 'export default "base";');
  f.request.controlCommit = f.commit("approve workspace");
  f.request.expectedBase = f.request.controlCommit;
  await f.put("packages/fixture/index.mjs", 'export default "candidate";');
  f.request.candidateCommit = f.commit("workspace result");
  f.request.resultCommit = f.request.candidateCommit;
  await f.put("packages/fixture/index.mjs", 'export default "dirty original";');
  const source = path.join(f.directory, "dependencies");
  const scope = path.join(f.directory, "external-scope");
  await mkdir(source);
  await mkdir(scope);
  await symlink(
    path.join(f.repository, "packages/fixture"),
    path.join(scope, "package")
  );
  await symlink(scope, path.join(source, "@fixture"));

  const report = await verifyCandidate({
    ...f.request,
    dependencyLinks: [{ path: "node_modules", source }],
  });

  assert.equal(report.status, "infrastructure_failure", JSON.stringify(report));
  assert.match(report.errors[0], /scope.*ordinary directory/u);
  assert.equal(report.checks.length, 0);
});

for (const installedName of ["fixture", "workspace-alias"]) {
  test(`workspace executable links through ${installedName} cannot execute dirty original code`, async (context) => {
    const f = await fixture(context, {
      check:
        'import {execFileSync} from "node:child_process"; execFileSync("fixture-cli");',
    });

    await f.put(
      "packages/fixture/package.json",
      JSON.stringify({ bin: { "fixture-cli": "cli.mjs" }, name: "fixture" })
    );
    await f.put(
      "packages/fixture/cli.mjs",
      "#!/usr/bin/env node\nprocess.exit(1);\n"
    );
    await chmod(path.join(f.repository, "packages/fixture/cli.mjs"), 0o755);
    f.request.controlCommit = f.commit("approve workspace executable");
    f.request.expectedBase = f.request.controlCommit;
    await f.put("src/value.txt", "candidate");
    f.request.candidateCommit = f.commit("candidate with failing executable");
    f.request.resultCommit = f.request.candidateCommit;
    await f.put(
      "packages/fixture/cli.mjs",
      "#!/usr/bin/env node\nprocess.exit(0);\n"
    );
    const source = path.join(f.directory, "dependencies");
    await mkdir(path.join(source, ".bin"), { recursive: true });
    await symlink(
      path.join(f.repository, "packages/fixture"),
      path.join(source, installedName)
    );
    await symlink(
      `../${installedName}/cli.mjs`,
      path.join(source, ".bin/fixture-cli")
    );
    execFileSync(path.join(source, ".bin/fixture-cli"));

    const report = await verifyCandidate({
      ...f.request,
      dependencyLinks: [{ path: "node_modules", source }],
    });

    assert.equal(
      report.status,
      "infrastructure_failure",
      JSON.stringify(report)
    );
    assert.match(report.errors[0], /executable.*external package/u);
    assert.equal(report.checks.length, 0);
  });
}

test("third-party executable links remain available", async (context) => {
  const f = await fixture(context, {
    check:
      'import {execFileSync} from "node:child_process"; execFileSync("fixture-cli");',
  });

  const source = path.join(f.directory, "dependencies");
  const external = path.join(f.directory, "external-package");
  await mkdir(external);
  await writeFile(
    path.join(external, "cli.mjs"),
    "#!/usr/bin/env node\nprocess.exit(0);\n",
    { mode: 0o755 }
  );
  await mkdir(path.join(source, ".bin"), { recursive: true });
  await symlink(external, path.join(source, "third-party"));
  await symlink(
    "../third-party/cli.mjs",
    path.join(source, ".bin/fixture-cli")
  );

  const report = await verifyCandidate({
    ...f.request,
    dependencyLinks: [{ path: "node_modules", source }],
  });

  assert.equal(report.status, "passed", JSON.stringify(report));
});
