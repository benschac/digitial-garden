import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

const recoveryProbes = [
  ["core", "task.catch(recover);", true],
  ["core", 'task["catch"](recover);', true],
  ["core", "task[`catch`](recover);", true],
  ["core", "task?.catch(recover);", true],
  ["core", "task.then(success, recover);", true],
  ["core", "const recoverLater = task.catch;", true],
  ["core", "const { catch: recoverLater } = task;", true],
  ["core", "task.then(success);", false],
  [
    "core",
    'import { Effect as E } from "effect"; E.catch(work, recover);',
    false,
  ],
  ["core", 'import * as E from "effect/Effect"; E.catch(recover);', false],
  ["core", 'import * as E from "effect"; E.Effect.catch(recover);', false],
  [
    "core",
    'import { Effect } from "effect"; const work = (Effect) => Effect.catch(recover);',
    true,
  ],
  [
    "core",
    'import { Effect } from "effect"; Effect.tryPromise({ try: load, catch: cause => new LoadError({ cause }) });',
    false,
  ],
  ["boundary", "task.catch(recover);", false],
  ["boundary", "task.then(success, recover);", false],
  [
    "boundary",
    'import { Effect } from "effect"; Effect.map(work, () => task.catch(recover));',
    true,
  ],
  [
    "boundary",
    'import { Effect as E } from "effect"; E.gen(function* () { yield* E.promise(() => task.catch(recover)); });',
    true,
  ],
  [
    "boundary",
    'import * as E from "effect/Effect"; E.fn("load")(function* () { task.then(success, recover); });',
    true,
  ],
  [
    "boundary",
    'import { gen as program } from "effect/Effect"; program(function* () { task.catch(recover); });',
    true,
  ],
];

test("keeps Promise recovery outside Effect workflows and at declared boundaries", (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), "promise-boundaries-"));
  t.after(() => rmSync(cwd, { force: true, recursive: true }));
  copyFileSync(
    path.join(root, "oxlint.config.mts"),
    path.join(cwd, "oxlint.config.mts")
  );

  for (const directory of ["node_modules", "tools"]) {
    symlinkSync(path.join(root, directory), path.join(cwd, directory));
  }

  const files = recoveryProbes.map(([owner, source], index) => {
    const directory = `fixture-${index}/apps/web/scripts`;
    const file = `${directory}/${owner === "boundary" ? "dev-port" : "workflow"}.ts`;
    mkdirSync(path.join(cwd, directory), { recursive: true });
    writeFileSync(path.join(cwd, file), source);

    return file;
  });

  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "node_modules/oxlint/bin/oxlint"),
      "--format=json",
      ...files,
    ],
    { cwd, encoding: "utf-8", timeout: 30_000 }
  );

  assert.equal(result.status, 1, `${result.stdout}${result.stderr}`);
  const { diagnostics } = JSON.parse(result.stdout);

  for (const [index, probe] of recoveryProbes.entries()) {
    assert.equal(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.filename === files[index] &&
          diagnostic.code === "project-patterns(promise-recovery)"
      ),
      probe[2],
      `${files[index]}: ${result.stdout}`
    );
  }
});

const probes = [
  ...[
    "runPromiseWith",
    "runPromiseExitWith",
    "runSyncWith",
    "runSyncExitWith",
    "runForkWith",
    "runCallbackWith",
  ].flatMap((runner) => [
    [
      "service",
      `import { ${runner} as execute } from "effect/Effect"; export { execute };`,
      true,
    ],
    [
      "service",
      `import { Effect as E } from "effect"; export const execute = E.${runner};`,
      true,
    ],
  ]),
  [
    "service",
    'import { Effect as E } from "effect"; export const execute = E.runPromise;',
    true,
  ],
  [
    "service",
    'import { Effect } from "effect"; export const execute = Effect["runSync"];',
    true,
  ],
  [
    "service",
    'import { Effect } from "effect"; export const execute = (Effect: { runPromise: number }) => Effect.runPromise;',
    false,
  ],
  [
    "service",
    'import { Effect } from "other-library"; export const execute = Effect.runPromise;',
    false,
  ],
  [
    "adapter",
    'import { Effect } from "effect"; export const execute = Effect.runPromise;',
    false,
  ],
  [
    "service",
    'import { ManagedRuntime as Owner } from "effect"; export { Owner };',
    true,
  ],
  [
    "service",
    'import * as Owner from "effect/ManagedRuntime"; export { Owner };',
    true,
  ],
  [
    "service",
    'import { runPromise as execute } from "effect/Effect"; export { execute };',
    true,
  ],
  [
    "service",
    'import * as E from "effect/Effect"; export const execute = E.runPromise;',
    true,
  ],
  [
    "service",
    'import { Effect } from "effect"; export const work = Effect.void;',
    false,
  ],
  [
    "service",
    'import { succeed as value } from "effect/Effect"; export { value };',
    false,
  ],
  ["service", "export const ManagedRuntime = { make: () => 1 };", false],
  [
    "adapter",
    'import { ManagedRuntime } from "effect"; export { ManagedRuntime };',
    false,
  ],
];

test("keeps runtime imports at application integration boundaries", () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "pattern-boundaries-"));

  try {
    copyFileSync(
      path.join(root, "oxlint.config.mts"),
      path.join(cwd, "oxlint.config.mts")
    );

    for (const directory of ["node_modules", "tools"]) {
      symlinkSync(path.join(root, directory), path.join(cwd, directory));
    }

    mkdirSync(path.join(cwd, "apps/web/src"), { recursive: true });

    const files = probes.map(([owner, source], index) => {
      const file = `apps/web/src/probe-${index}-${owner}.ts`;
      writeFileSync(path.join(cwd, file), source);

      return file;
    });

    const result = spawnSync(
      process.execPath,
      [
        path.join(root, "node_modules/oxlint/bin/oxlint"),
        "--format=json",
        ...files,
      ],
      { cwd, encoding: "utf-8" }
    );

    assert.equal(result.status, 1, result.stderr);
    const { diagnostics } = JSON.parse(result.stdout);

    for (const [index, probe] of probes.entries()) {
      assert.equal(
        diagnostics.some(
          (diagnostic) =>
            diagnostic.filename === files[index] &&
            (diagnostic.code?.includes("no-restricted-imports") ||
              diagnostic.code?.includes("service-execution"))
        ),
        probe[2],
        files[index]
      );
    }
  } finally {
    rmSync(cwd, { force: true, recursive: true });
  }
});
