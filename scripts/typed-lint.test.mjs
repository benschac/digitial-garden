import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

test("typed lint permits synchronous async APIs and rejects Promise and Effect misuse", (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), "personal-site-typed-lint-"));
  t.after(() => rmSync(cwd, { force: true, recursive: true }));
  symlinkSync(path.join(root, "node_modules"), path.join(cwd, "node_modules"));
  writeFileSync(
    path.join(cwd, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "bundler",
        noEmit: true,
        strict: true,
        target: "ESNext",
      },
      include: ["*.ts"],
    })
  );
  writeFileSync(
    path.join(cwd, "accepted.ts"),
    `
export const value = async (): Promise<number> => 1;
export const failure = async (): Promise<never> => { throw new Error("failed"); };
export const forward = async (): Promise<number> => value();
export const awaited = async (): Promise<number> => await value();

export const recover = async (): Promise<number> => {
  try { return await value(); } catch { return 0; }
};
`
  );
  writeFileSync(
    path.join(cwd, "rejected.ts"),
    `
import { Effect } from "effect";
export const value = async (): Promise<number> => 1;
value();
[1].forEach(value);
Effect.succeed(1);
export const syncPromise = (): Promise<number> => Promise.resolve(1);
export const wrongAwait = async () => await 1;
export const missedRejection = async (): Promise<number> => {
  try { return value(); } catch { return 0; }
};
`
  );

  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "node_modules/@effect/tsgo/dist/effect-tsgo.cjs"),
      "--tsrs-lint=0.21.0-ts7.1.0-beta",
      "oxlint",
      "--type-aware",
      "--config",
      path.join(root, "oxlint.typed.config.mts"),
      "--format",
      "json",
      "accepted.ts",
      "rejected.ts",
    ],
    { cwd, encoding: "utf-8", timeout: 30_000 }
  );

  assert.equal(result.status, 1, `${result.stdout}${result.stderr}`);
  const { diagnostics } = JSON.parse(result.stdout);
  assert.deepEqual(
    diagnostics.filter((diagnostic) =>
      diagnostic.filename.endsWith("accepted.ts")
    ),
    []
  );
  const codes = new Set(diagnostics.map((diagnostic) => diagnostic.code));

  for (const rule of [
    "typescript(no-floating-promises)",
    "typescript(no-misused-promises)",
    "effecttsgo(floating-effect)",
    "typescript(promise-function-async)",
    "typescript(await-thenable)",
    "typescript(return-await)",
  ]) {
    assert.ok(codes.has(rule), `${rule}: ${result.stdout}`);
  }
});
