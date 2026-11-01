import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { main, search, validateCatalog } from "./agent-patterns.mjs";

const sources = [{ commit: "a".repeat(40), name: "effect", packages: [] }];

const fixture = (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "pattern-test-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));

  for (const directory of ["scripts", "agent-patterns", "apps/web"]) {
    mkdirSync(path.join(root, directory), { recursive: true });
  }

  writeFileSync(path.join(root, "owner.ts"), "export const value = 1;");
  writeFileSync(
    path.join(root, "scripts/agent-sources.json"),
    JSON.stringify(sources)
  );
  writeFileSync(path.join(root, "apps/web/package.json"), "{}");

  const entry = {
    checks: [
      { claim: "Fixture path exists", kind: "behavior", path: "owner.ts" },
    ],
    concerns: ["cancellation"],
    decision: "Release resources with their owner",
    exceptions: ["Framework owns rendering"],
    gaps: [],
    id: "resource-owner",
    owners: ["owner.ts"],
    references: ["https://example.com/source"],
    related: [],
    sources: [
      { commit: sources[0].commit, name: "effect", paths: ["src/Scope.ts"] },
    ],
    title: "Resource ownership",
  };

  const save = () =>
    writeFileSync(
      path.join(root, "agent-patterns/catalog.json"),
      JSON.stringify([entry])
    );

  save();

  return { entry, root, save };
};

test("retrieves deterministic JSON and identifies affected source decisions", (t) => {
  const { root } = fixture(t);
  assert.equal(
    JSON.parse(main(root, ["search", "cancellation", "--json"]))[0].id,
    "resource-owner"
  );
  assert.equal(
    JSON.parse(main(root, ["affected", "effect", "--json"])).length,
    1
  );
  assert.match(main(root, ["check"]), /Validated 1/u);
  assert.throws(() => main(root, ["show", "missing"]), /No matching/u);
  assert.throws(() => main(root, ["search", "unmatched"]), /No matching/u);
  assert.throws(() => main(root, ["affected", "unknown"]), /known source/u);
});

test("rejects stale pins, missing owners, invalid relations and malformed records", (t) => {
  const { root, entry } = fixture(t);

  for (const [change, message] of [
    [{ sources: [{ ...entry.sources[0], commit: "b".repeat(40) }] }, /stale/u],
    [{ owners: ["missing.ts"] }, /ENOENT/u],
    [{ related: ["missing"] }, /related/u],
    [{ extra: true }, /fields/u],
    [{ concerns: [] }, /strings/u],
    [{ checks: [] }, /checks/u],
  ]) {
    assert.throws(
      () => validateCatalog(root, [{ ...entry, ...change }], sources),
      message
    );
  }
});

test("rejects path traversal and symlink escapes", (t) => {
  const { root, entry } = fixture(t);

  for (const unsafe of ["../outside", "/etc/passwd", "a\\b", "a/../b"]) {
    assert.throws(
      () => validateCatalog(root, [{ ...entry, owners: [unsafe] }], sources),
      /Unsafe/u
    );
    assert.throws(
      () =>
        validateCatalog(
          root,
          [{ ...entry, sources: [{ ...entry.sources[0], paths: [unsafe] }] }],
          sources
        ),
      /Unsafe/u
    );
  }

  symlinkSync(process.execPath, path.join(root, "escape"));
  assert.throws(
    () => validateCatalog(root, [{ ...entry, owners: ["escape"] }], sources),
    /outside root/u
  );
});

test("mirror references are optional offline and required for source validation", (t) => {
  const { root, entry } = fixture(t);
  assert.equal(validateCatalog(root, [entry], sources).length, 1);
  assert.throws(() => validateCatalog(root, [entry], sources, true), /ENOENT/u);
});

test("search ranks concerns above incidental decision matches with stable ties", () => {
  const records = [
    { concerns: [], decision: "cancellation", id: "b", title: "B" },
    { concerns: ["cancellation"], decision: "", id: "c", title: "C" },
    { concerns: ["cancellation"], decision: "", id: "a", title: "A" },
  ];

  assert.deepEqual(
    search(records, "cancellation").map((entry) => entry.id),
    ["a", "c", "b"]
  );
  assert.throws(() => search(records, ""), /requires terms/u);
});

test("affected remains available after source updates", (t) => {
  const { root, entry, save } = fixture(t);
  entry.sources[0].commit = "b".repeat(40);
  save();
  assert.equal(
    JSON.parse(main(root, ["affected", "effect", "--json"])).length,
    1
  );
  assert.throws(() => main(root, ["check"]), /stale/u);
});

test("actor lifecycle evidence is invalidated by either runtime dependency", () => {
  const entries = JSON.parse(
    readFileSync(
      new URL("../agent-patterns/catalog.json", import.meta.url),
      "utf-8"
    )
  );

  const actor = entries.find((entry) => entry.id === "actor-lifecycle");
  assert.ok(actor);

  for (const name of ["effect", "xstate-effect"]) {
    assert.ok(
      actor.sources.some((source) => source.name === name),
      `Actor scope and bridge behavior must be revalidated when ${name} changes`
    );
  }
});
