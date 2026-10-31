import assert from "node:assert/strict";
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

import { runOxcTool } from "./oxc-tool.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

for (const probe of [
  {
    file: "apps/web/src/app/_components/agent-chat-submission.ts",
    name: "chat acceptance cannot recreate manual deferred ownership",
    rejected: true,
    source: "export const wait = () => Promise.withResolvers();",
  },
  {
    file: "apps/web/src/components/ai-elements/prompt-input-attachments.ts",
    name: "attachment coordinator cannot recreate manual deferred ownership",
    rejected: true,
    source: "export const wait = () => Promise.withResolvers();",
  },
  {
    file: "apps/web/src/app/_components/agent-chat-submission.ts",
    name: "ordinary promise construction remains rejected",
    rejected: true,
    source: "export const wait = () => new Promise((resolve) => resolve(1));",
  },
  {
    file: "apps/web/src/app/_components/agent-chat-submission.ts",
    name: "Effect callback owns the acceptance wait",
    rejected: false,
    source:
      'import { Effect } from "effect";\n\nexport const wait = () => Effect.callback((resume) => resume(Effect.succeed(1)));',
  },
  {
    file: "apps/web/src/app/_components/agent-chat-submission.ts",
    name: "Promise integration boundaries remain supported",
    rejected: false,
    source:
      'import { Effect } from "effect";\n\nexport const wait = () => Effect.runPromise(Effect.succeed(1));',
  },
  {
    file: "apps/web/src/app/_components/agent-chat-submission.test.ts",
    name: "controlled transport tests may use deferred promises",
    rejected: false,
    source: "export const response = () => Promise.withResolvers();",
  },
  {
    file: "apps/web/scripts/native-adapter.ts",
    name: "unrelated native adapters are outside the ownership rule",
    rejected: false,
    source: "export const response = () => Promise.withResolvers();",
  },
]) {
  test(probe.name, (t) => {
    const cwd = mkdtempSync(path.join(tmpdir(), "personal-site-review-fence-"));
    t.after(() => rmSync(cwd, { force: true, recursive: true }));
    copyFileSync(
      path.join(root, "oxlint.config.mts"),
      path.join(cwd, "oxlint.config.mts")
    );

    for (const directory of ["node_modules", "tools"]) {
      symlinkSync(path.join(root, directory), path.join(cwd, directory));
    }

    const target = path.join(cwd, probe.file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, `${probe.source}\n`);

    const result = runOxcTool(
      "lint",
      [
        "--config",
        path.join(cwd, "oxlint.config.mts"),
        "--format=json",
        probe.file,
      ],
      { cwd, encoding: "utf-8" }
    );

    assert.equal(
      result.status,
      probe.rejected ? 1 : 0,
      `${result.stdout}${result.stderr}`
    );

    if (probe.rejected) {
      assert.match(result.stdout, /no-restricted-properties|avoid-new/u);
    }
  });
}

test("submission owners satisfy the settlement rule despite unrelated style debt", () => {
  const result = runOxcTool(
    "lint",
    [
      "--config",
      path.join(root, "oxlint.config.mts"),
      "--format=json",
      "apps/web/src/app/_components/agent-chat-submission.ts",
      "apps/web/src/components/ai-elements/prompt-input-attachments.ts",
    ],
    { cwd: root, encoding: "utf-8" }
  );

  assert.ifError(result.error);
  assert.ok(result.status === 0 || result.status === 1, result.stderr);

  const { diagnostics, number_of_files: filesChecked } = JSON.parse(
    result.stdout
  );

  assert.equal(filesChecked, 2);

  const failures = diagnostics.filter(
    ({ code }) => !code || /no-restricted-properties|avoid-new/u.test(code)
  );

  assert.deepEqual(failures, []);
});
