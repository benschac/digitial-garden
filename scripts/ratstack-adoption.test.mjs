import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

import { run } from "./agent-sources.mjs";
import {
  auditInventory,
  main,
  validateInventory,
} from "./ratstack-adoption.mjs";

test("adopted policy sources remain discoverable as adopted inventory records", () => {
  const policy = readFileSync(
    new URL("../agent-patterns/engineering-policies.md", import.meta.url),
    "utf-8"
  );

  const inventory = JSON.parse(
    readFileSync(
      new URL("../agent-patterns/ratstack-inventory.json", import.meta.url),
      "utf-8"
    )
  );

  const slugs = [
    ...policy.matchAll(/https:\/\/ratstack\.sh\/lore\/(?<slug>[a-z0-9-]+)/gu),
  ].map((match) => match.groups.slug);

  assert.ok(slugs.length > 0);

  for (const slug of new Set(slugs)) {
    const item = inventory.items.find(
      (entry) => entry.path === `.brain/resources/lore/${slug}.svx`
    );

    assert.equal(item?.disposition, "adopted", slug);
    assert.ok(item.localPaths.length > 0, slug);
  }
});

const fixture = (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "ratstack-adoption-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const source = path.join(root, "source");

  for (const directory of [
    "agent-patterns",
    "source/.brain/resources/lore",
    "source/.brain/data/learn-cards",
  ]) {
    mkdirSync(path.join(root, directory), { recursive: true });
  }

  writeFileSync(path.join(root, "owner.md"), "Local policy");
  writeFileSync(
    path.join(source, ".brain/resources/lore/ownership.svx"),
    "Own cleanup"
  );
  run("git", ["init", "-q"], source);
  run(
    "git",
    [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.test",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      "commit",
      "--allow-empty",
      "-qm",
      "Fixture",
    ],
    source
  );

  const inventory = {
    items: [
      {
        disposition: "adopted",
        localPaths: ["owner.md"],
        path: ".brain/resources/lore/ownership.svx",
        reason: "Scope owns cleanup",
        sha256: createHash("sha256").update("Own cleanup").digest("hex"),
      },
    ],
    repository: "fixture",
    revision: run("git", ["rev-parse", "HEAD"], source),
  };

  const save = () =>
    writeFileSync(
      path.join(root, "agent-patterns/ratstack-inventory.json"),
      JSON.stringify(inventory)
    );

  save();

  return { inventory, root, save, source };
};

test("inventory retrieval preserves disposition and local adoption evidence", (t) => {
  const { root } = fixture(t);
  const records = JSON.parse(main(root, ["search", "cleanup", "--json"]));
  assert.equal(records[0].disposition, "adopted");
  assert.match(main(root, ["check"]), /Validated 1/u);
  assert.throws(() => main(root, ["search", "unknown"]), /No matching/u);
});

test("inventory rejects missing adoption owners, invalid metadata and unsafe links", (t) => {
  const { root, inventory } = fixture(t);
  const [original] = inventory.items;

  for (const change of [
    { localPaths: [] },
    { localPaths: ["missing.md"] },
    { path: "../outside" },
    { sha256: "bad" },
    { disposition: "maybe" },
    { reason: "" },
  ]) {
    assert.throws(() =>
      validateInventory(root, {
        ...inventory,
        items: [{ ...original, ...change }],
      })
    );
  }

  symlinkSync(process.execPath, path.join(root, "escape"));
  assert.throws(
    () =>
      validateInventory(root, {
        ...inventory,
        items: [{ ...original, localPaths: ["escape"] }],
      }),
    /Invalid inventory file/u
  );
  assert.throws(
    () =>
      validateInventory(root, { ...inventory, items: [original, original] }),
    /Duplicate/u
  );
});

test("source audit catches unclassified additions, edited content and revision drift", (t) => {
  const { root, source, inventory } = fixture(t);
  assert.equal(auditInventory(root, inventory, source), 1);
  const extra = path.join(source, ".brain/data/learn-cards/new.ts");
  writeFileSync(extra, "new example");
  assert.throws(
    () => auditInventory(root, inventory, source),
    /Unclassified source/u
  );
  rmSync(extra);
  writeFileSync(path.join(source, inventory.items[0].path), "Changed cleanup");
  assert.throws(
    () => auditInventory(root, inventory, source),
    /Source content changed/u
  );
  assert.throws(
    () =>
      auditInventory(root, { ...inventory, revision: "0".repeat(40) }, source),
    /Source revision changed/u
  );
});
