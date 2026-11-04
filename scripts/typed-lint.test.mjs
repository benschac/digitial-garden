import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
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
      include: ["**/*.ts"],
    })
  );

  mkdirSync(path.join(cwd, "apps/web/src"), { recursive: true });
  writeFileSync(
    path.join(cwd, "apps/web/src/accepted-service.ts"),
    `
import { Effect } from "effect";

declare const load: () => Promise<number>;
declare const recover: (failure: "LoadFailure") => Effect.Effect<number, "RecoveryFailure">;

export const mapped = Effect.tryPromise({ catch: () => "LoadFailure" as const, try: load });
export const recovered = Effect.catch(mapped, recover);
`
  );
  writeFileSync(
    path.join(cwd, "effect-errors.ts"),
    `
import { Effect } from "effect";

declare const load: () => Promise<number>;

export const untyped = Effect.tryPromise(load);
export const unknownFailure = Effect.tryPromise({ try: load, catch: (cause) => cause });
export const genericFailure = Effect.tryPromise({ try: load, catch: (cause) => new Error(String(cause)) });
export const lazyPromise = Effect.sync(load);
export const promiseSuccess = Effect.succeed(load());
export const nestedRun = Effect.gen(function* () { return Effect.runSync(Effect.succeed(1)); });
export const wrongRecovery = Effect.gen(function* () {
  try { return yield* Effect.fail("failed"); } catch { return 0; }
});
`
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

export const recoverUnknown = async (promise: Promise<string>) => promise.catch((cause: unknown) => {
  if (cause instanceof Error) { return cause.message; }

  return "Unknown failure";
});

export const narrowed = (input: string | undefined) => {
  if (input === undefined) { throw new Error("missing"); }

  return input;
};

export const callback = (action: () => void) => () => { action(); };
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
export const asserted = (value: string | undefined) => value as string;
export const nonNull = (value: string | undefined) => value!;
export const untypedCatch = async (promise: Promise<number>) => promise.catch((cause) => String(cause));
export const unknownInput = (input: unknown) => String(input);
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
      "apps/web/src/accepted-service.ts",
      "effect-errors.ts",
    ],
    { cwd, encoding: "utf-8", timeout: 30_000 }
  );

  assert.equal(result.status, 1, `${result.stdout}${result.stderr}`);
  const { diagnostics } = JSON.parse(result.stdout);
  assert.deepEqual(
    diagnostics.filter((diagnostic) =>
      /accepted(?:-service)?\.ts$/u.test(diagnostic.filename)
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
    "typescript(no-unsafe-type-assertion)",
    "typescript(no-non-null-assertion)",
    "typescript(use-unknown-in-catch-callback-variable)",
    "anti-slop(no-unknown-parameters)",
  ]) {
    assert.ok(codes.has(rule), `${rule}: ${result.stdout}`);
  }

  assert.ok(!codes.has("typescript(non-nullable-type-assertion-style)"));

  for (const rule of [
    "effect-try-without-catch",
    "global-error-in-effect-catch",
    "lazy-promise-in-effect-sync",
    "promise-in-effect-success",
    "run-effect-inside-effect",
    "try-catch-in-effect-gen",
    "unknown-in-effect-catch",
  ]) {
    assert.ok(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.code === `effecttsgo(${rule})` &&
          diagnostic.severity === "error"
      ),
      `${rule}: ${result.stdout}`
    );
  }
});
