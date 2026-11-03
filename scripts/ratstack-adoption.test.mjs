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
    "Own cleanup crystalline"
  );
  run("git", ["init", "-q"], source);
  run("git", ["add", ".brain"], source);

  const commit = () =>
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

  commit();

  const inventory = {
    items: [
      {
        disposition: "adopted",
        localPaths: ["owner.md"],
        path: ".brain/resources/lore/ownership.svx",
        reason: "Scope owns cleanup",
        searchTerms: "cleanup crystalline own",
        sha256: createHash("sha256")
          .update("Own cleanup crystalline")
          .digest("hex"),
      },
    ],
    repository: "https://github.com/example/fixture",
    revision: run("git", ["rev-parse", "HEAD"], source),
  };

  const save = () =>
    writeFileSync(
      path.join(root, "agent-patterns/ratstack-inventory.json"),
      JSON.stringify(inventory)
    );

  save();

  return { commit, inventory, root, save, source };
};

test("inventory retrieval preserves disposition and local adoption evidence", (t) => {
  const { root } = fixture(t);
  const records = JSON.parse(main(root, ["search", "cleanup", "--json"]));
  assert.equal(records[0].disposition, "adopted");
  assert.match(
    records[0].sourceUrl,
    /\/blob\/[a-f0-9]{40}\/\.brain\/resources/u
  );
  assert.equal(
    JSON.parse(main(root, ["search", "crystalline", "--json"])).length,
    1
  );
  assert.throws(() => main(root, ["search", "crystal"]), /No matching/u);
  assert.match(main(root, ["check"]), /Validated 1/u);
  assert.throws(() => main(root, ["search", "unknown"]), /No matching/u);
});

test("source paths rank before incidental body matches", (t) => {
  const { root, inventory, save } = fixture(t);
  inventory.items.push({
    ...inventory.items[0],
    disposition: "reference",
    localPaths: [],
    path: ".brain/aaa.svx",
    searchTerms: "ownership",
  });
  save();
  assert.equal(
    JSON.parse(main(root, ["search", "ownership", "--json"]))[0].path,
    ".brain/resources/lore/ownership.svx"
  );
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
    { searchTerms: "own cleanup" },
    { searchTerms: undefined },
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

test("source audit catches additions outside lore, edited content and revision drift", (t) => {
  const { root, source, inventory, commit } = fixture(t);
  assert.equal(auditInventory(root, inventory, source), 1);
  const extra = path.join(source, ".brain/research.svx");
  writeFileSync(extra, "new example");
  run("git", ["add", ".brain"], source);
  commit();
  inventory.revision = run("git", ["rev-parse", "HEAD"], source);
  assert.throws(
    () => auditInventory(root, inventory, source),
    /Unclassified source/u
  );
  inventory.items.push({
    disposition: "reference",
    localPaths: [],
    path: ".brain/research.svx",
    reason: "Historical research",
    searchTerms: "example new",
    sha256: createHash("sha256").update("new example").digest("hex"),
  });
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

test("index migrates legacy records, discovers the whole brain and is repeatable", (t) => {
  const { root, source, inventory, save, commit } = fixture(t);
  const [{ searchTerms: _searchTerms, ...legacy }] = inventory.items;
  inventory.items = [legacy];
  writeFileSync(path.join(source, ".brain/research.svx"), "Quasar research");
  writeFileSync(path.join(source, ".gitignore"), "ignored.svx\n");
  writeFileSync(path.join(source, ".brain/ignored.svx"), "ignored context");
  run("git", ["add", ".brain", ".gitignore"], source);
  commit();
  inventory.revision = run("git", ["rev-parse", "HEAD"], source);
  save();
  assert.throws(() => main(root, ["check"]), /fields/u);
  assert.match(main(root, ["index", source]), /Indexed 2/u);
  const filename = path.join(root, "agent-patterns/ratstack-inventory.json");
  const first = readFileSync(filename, "utf-8");
  main(root, ["index", source]);
  assert.equal(readFileSync(filename, "utf-8"), first);
  const indexed = JSON.parse(first);
  assert.equal(
    indexed.items.find((item) => item.path === legacy.path).disposition,
    "adopted"
  );
  const [result] = JSON.parse(main(root, ["search", "quasar", "--json"]));
  assert.equal(result.disposition, "reference");
  assert.deepEqual(result.localPaths, []);
  assert.match(result.reason, /not reviewed or adopted/u);
  assert.equal(auditInventory(root, indexed, source), 2);
  indexed.items[0].searchTerms = "fabricated";
  assert.throws(
    () => auditInventory(root, indexed, source),
    /search terms changed/u
  );
  writeFileSync(path.join(source, legacy.path), "Edited source");
  assert.throws(() => main(root, ["index", source]), /checkout has changes/u);
  assert.equal(readFileSync(filename, "utf-8"), first);
});

test("read verifies the source identity and bytes before exposing source text", (t) => {
  const { root, source, inventory, save } = fixture(t);
  const sourcePath = inventory.items[0].path;
  assert.equal(
    main(root, ["read", sourcePath, source]),
    "Own cleanup crystalline"
  );
  const shown = JSON.parse(main(root, ["show", sourcePath, "--json"]));
  assert.match(shown.sourceUrl, new RegExp(inventory.revision, "u"));
  assert.throws(() => main(root, ["read", "../outside", source]), /Unsafe/u);
  writeFileSync(path.join(source, sourcePath), "Changed source");
  assert.throws(
    () => main(root, ["read", sourcePath, source]),
    /content changed/u
  );
  inventory.revision = "0".repeat(40);
  save();
  assert.throws(
    () => main(root, ["read", sourcePath, source]),
    /revision changed/u
  );
});
