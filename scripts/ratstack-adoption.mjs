import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { run } from "./agent-sources.mjs";

const text = (value) =>
  Object.prototype.toString.call(value) === "[object String]" &&
  value.trim().length > 0;

const searchTerms = (value) =>
  [...new Set(value.toLowerCase().match(/[a-z0-9]+/gu))].toSorted().join(" ");

const fields = (value, expected) => {
  assert.ok(
    value && Object.prototype.toString.call(value) === "[object Object]",
    "Expected a record"
  );
  assert.deepEqual(
    Object.keys(value).toSorted(),
    expected.toSorted(),
    "Unexpected inventory fields"
  );
};

const safePath = (value) => {
  assert.ok(
    text(value) && !path.isAbsolute(value) && !/[\\:\0]/u.test(value),
    "Unsafe inventory path"
  );
  assert.ok(
    value.split("/").every((part) => part && part !== "." && part !== ".."),
    "Unsafe inventory path"
  );
};

const localFile = (root, relative) => {
  safePath(relative);
  const base = realpathSync(root);
  const target = realpathSync(path.join(base, relative));
  assert.ok(
    target.startsWith(`${base}${path.sep}`) && statSync(target).isFile(),
    `Invalid inventory file: ${relative}`
  );

  return target;
};

const validateRecords = (root, inventory, legacy) => {
  fields(inventory, ["repository", "revision", "items"]);
  assert.match(
    inventory.repository,
    /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u,
    "Expected a GitHub source repository URL"
  );
  assert.match(
    inventory.revision,
    /^[a-f0-9]{40}$/u,
    "Invalid source revision"
  );
  assert.ok(
    Array.isArray(inventory.items) && inventory.items.length > 0,
    "Empty inventory"
  );
  const seen = new Set();

  for (const item of inventory.items) {
    fields(item, [
      "path",
      "sha256",
      "disposition",
      "reason",
      "localPaths",
      ...(!legacy || Object.hasOwn(item, "searchTerms") ? ["searchTerms"] : []),
    ]);
    safePath(item.path);
    assert.ok(!seen.has(item.path), `Duplicate inventory item: ${item.path}`);
    seen.add(item.path);
    assert.match(item.sha256, /^[a-f0-9]{64}$/u, "Invalid content hash");

    if (!legacy || Object.hasOwn(item, "searchTerms")) {
      assert.match(item.searchTerms, /^[a-z0-9 ]*$/u, "Invalid search terms");
      assert.equal(
        item.searchTerms,
        searchTerms(item.searchTerms),
        "Noncanonical search terms"
      );
    }

    assert.ok(
      ["adopted", "reference", "excluded"].includes(item.disposition),
      "Invalid disposition"
    );
    assert.ok(text(item.reason), `Missing rationale: ${item.path}`);
    assert.ok(Array.isArray(item.localPaths), "Expected local paths");
    assert.ok(
      item.disposition !== "adopted" || item.localPaths.length > 0,
      `Adopted item has no local owner: ${item.path}`
    );

    for (const target of item.localPaths) {
      localFile(root, target);
    }
  }

  return inventory;
};

export const validateInventory = (root, inventory) =>
  validateRecords(root, inventory, false);

const verifyRevision = (inventory, sourceRoot) => {
  assert.equal(
    run("git", ["rev-parse", "HEAD"], sourceRoot),
    inventory.revision,
    "Source revision changed; review the inventory before refreshing it"
  );
};

const trackedBrain = (sourceRoot) =>
  run(
    "git",
    ["ls-tree", "-r", "--name-only", "-z", "HEAD", "--", ".brain"],
    sourceRoot
  )
    .split("\0")
    .filter(Boolean);

const sourceBytes = (sourceRoot, item) => {
  const bytes = readFileSync(localFile(sourceRoot, item.path));
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    item.sha256,
    `Source content changed: ${item.path}`
  );

  return bytes;
};

const verifyClean = (inventory, sourceRoot) => {
  assert.equal(
    run(
      "git",
      [
        "status",
        "--porcelain",
        "--untracked-files=no",
        "--",
        ".brain",
        ...inventory.items.map((item) => item.path),
      ],
      sourceRoot
    ),
    "",
    "Source checkout has changes to indexed files"
  );

  for (const item of inventory.items) {
    run("git", ["cat-file", "-e", `HEAD:${item.path}`], sourceRoot);
  }
};

export const auditInventory = (root, inventory, sourceRoot) => {
  validateInventory(root, inventory);
  verifyRevision(inventory, sourceRoot);
  const recorded = new Set(inventory.items.map((item) => item.path));

  for (const source of trackedBrain(sourceRoot)) {
    assert.ok(recorded.has(source), `Unclassified source: ${source}`);
  }

  for (const item of inventory.items) {
    assert.equal(
      searchTerms(sourceBytes(sourceRoot, item).toString("utf-8")),
      item.searchTerms,
      `Source search terms changed: ${item.path}`
    );
  }

  verifyClean(inventory, sourceRoot);

  return inventory.items.length;
};

const indexInventory = (root, inventory, sourceRoot) => {
  validateRecords(root, inventory, true);
  verifyRevision(inventory, sourceRoot);
  verifyClean(inventory, sourceRoot);
  const records = new Map(inventory.items.map((item) => [item.path, item]));

  for (const source of trackedBrain(sourceRoot)) {
    if (!records.has(source)) {
      records.set(source, {
        disposition: "reference",
        localPaths: [],
        path: source,
        reason:
          "Indexed historical brain context; not reviewed or adopted as a local engineering policy.",
        sha256: createHash("sha256")
          .update(readFileSync(localFile(sourceRoot, source)))
          .digest("hex"),
      });
    }
  }

  const indexed = {
    ...inventory,
    items: [...records.values()]
      .toSorted((a, b) => a.path.localeCompare(b.path, "en"))
      .map((item) => ({
        ...item,
        searchTerms: searchTerms(
          sourceBytes(sourceRoot, item).toString("utf-8")
        ),
      })),
  };

  auditInventory(root, indexed, sourceRoot);

  return indexed;
};

const sourceRecord = (inventory, item) => {
  const { searchTerms: _searchTerms, ...record } = item;

  return {
    ...record,
    sourceUrl: `${inventory.repository}/blob/${inventory.revision}/${item.path.split("/").map(encodeURIComponent).join("/")}`,
  };
};

export const searchInventory = (root, query) => {
  const inventory = validateInventory(
    root,
    JSON.parse(
      readFileSync(
        path.join(root, "agent-patterns/ratstack-inventory.json"),
        "utf-8"
      )
    )
  );

  const terms = searchTerms(query).split(" ").filter(Boolean);
  assert.ok(terms.length > 0, "search requires terms");

  return inventory.items
    .filter((item) => {
      const indexed = new Set(
        `${item.searchTerms} ${searchTerms(`${item.path} ${item.reason} ${item.localPaths.join(" ")}`)}`.split(
          " "
        )
      );

      return terms.every((term) => indexed.has(term));
    })
    .map((item) => {
      const pathTerms = new Set(searchTerms(item.path).split(" "));

      return {
        item,
        score: terms.filter((term) => pathTerms.has(term)).length,
      };
    })
    .toSorted(
      (a, b) =>
        b.score - a.score || a.item.path.localeCompare(b.item.path, "en")
    )
    .map(({ item }) => sourceRecord(inventory, item));
};

export const main = (root, args) => {
  const json = args.includes("--json");

  const [command = "check", ...values] = args.filter(
    (value) => value !== "--json"
  );

  assert.ok(
    ["check", "search", "audit", "index", "show", "read"].includes(command),
    "Expected check, search <terms>, audit <source-root>, index <source-root>, show <source-path>, or read <source-path> <source-root>"
  );
  assert.ok(
    !json || ["search", "show"].includes(command),
    "--json is supported for search and show only"
  );

  const inventory = JSON.parse(
    readFileSync(
      path.join(root, "agent-patterns/ratstack-inventory.json"),
      "utf-8"
    )
  );

  if (command === "index") {
    assert.equal(values.length, 1, "index requires a source checkout path");
    const indexed = indexInventory(root, inventory, values[0]);
    writeFileSync(
      path.join(root, "agent-patterns/ratstack-inventory.json"),
      `${JSON.stringify(indexed, null, 2)}\n`
    );

    return `Indexed ${indexed.items.length} source files\n`;
  }

  validateInventory(root, inventory);

  if (command === "audit") {
    assert.equal(values.length, 1, "audit requires a source checkout path");

    return `Audited ${auditInventory(root, inventory, values[0])} source files\n`;
  }

  if (command === "check") {
    assert.equal(values.length, 0, "check takes no arguments");

    return `Validated ${inventory.items.length} adoption records\n`;
  }

  if (["show", "read"].includes(command)) {
    assert.equal(
      values.length,
      command === "read" ? 2 : 1,
      `${command} requires a source path${command === "read" ? " and source checkout path" : ""}`
    );
    safePath(values[0]);
    const item = inventory.items.find((entry) => entry.path === values[0]);
    assert.ok(item, "No matching adoption record");

    if (command === "read") {
      verifyRevision(inventory, values[1]);
      const bytes = sourceBytes(values[1], item);
      verifyClean({ ...inventory, items: [item] }, values[1]);

      return bytes.toString("utf-8");
    }

    return `${JSON.stringify(sourceRecord(inventory, item), null, 2)}\n`;
  }

  const matches = searchInventory(root, values.join(" "));

  assert.ok(matches.length > 0, "No matching adoption records");

  return json
    ? `${JSON.stringify(matches, null, 2)}\n`
    : `${matches.map((item) => `${item.disposition}: ${item.path}\n  ${item.reason}\n  ${item.sourceUrl}\n  ${item.localPaths.join(", ")}`).join("\n")}\n`;
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.stdout.write(
      main(fileURLToPath(new URL("..", import.meta.url)), process.argv.slice(2))
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
