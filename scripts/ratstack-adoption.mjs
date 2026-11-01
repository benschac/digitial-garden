import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { run } from "./agent-sources.mjs";

const text = (value) =>
  Object.prototype.toString.call(value) === "[object String]" &&
  value.trim().length > 0;

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

export const validateInventory = (root, inventory) => {
  fields(inventory, ["repository", "revision", "items"]);
  assert.ok(text(inventory.repository), "Missing source repository");
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
    fields(item, ["path", "sha256", "disposition", "reason", "localPaths"]);
    safePath(item.path);
    assert.ok(!seen.has(item.path), `Duplicate inventory item: ${item.path}`);
    seen.add(item.path);
    assert.match(item.sha256, /^[a-f0-9]{64}$/u, "Invalid content hash");
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

const walk = (root, relative) =>
  readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(
    (entry) => {
      const target = `${relative}/${entry.name}`;

      return entry.isDirectory() ? walk(root, target) : [target];
    }
  );

export const auditInventory = (root, inventory, sourceRoot) => {
  validateInventory(root, inventory);
  assert.equal(
    run("git", ["rev-parse", "HEAD"], sourceRoot),
    inventory.revision,
    "Source revision changed; review the inventory before refreshing it"
  );
  const recorded = new Set(inventory.items.map((item) => item.path));

  for (const directory of [
    ".brain/resources/lore",
    ".brain/data/learn-cards",
  ]) {
    for (const source of walk(sourceRoot, directory)) {
      assert.ok(recorded.has(source), `Unclassified source: ${source}`);
    }
  }

  for (const item of inventory.items) {
    const digest = createHash("sha256")
      .update(readFileSync(localFile(sourceRoot, item.path)))
      .digest("hex");

    assert.equal(digest, item.sha256, `Source content changed: ${item.path}`);
  }

  return inventory.items.length;
};

export const main = (root, args) => {
  const json = args.includes("--json");

  const [command = "check", ...values] = args.filter(
    (value) => value !== "--json"
  );

  assert.ok(
    ["check", "search", "audit"].includes(command),
    "Expected check, search <terms>, or audit <source-root>"
  );
  assert.ok(
    !json || command === "search",
    "--json is supported for search only"
  );

  const inventory = validateInventory(
    root,
    JSON.parse(
      readFileSync(
        path.join(root, "agent-patterns/ratstack-inventory.json"),
        "utf-8"
      )
    )
  );

  if (command === "audit") {
    assert.equal(values.length, 1, "audit requires a source checkout path");

    return `Audited ${auditInventory(root, inventory, values[0])} source files\n`;
  }

  if (command === "check") {
    assert.equal(values.length, 0, "check takes no arguments");

    return `Validated ${inventory.items.length} adoption records\n`;
  }

  const terms =
    values
      .join(" ")
      .toLowerCase()
      .match(/[a-z0-9]+/gu) ?? [];

  assert.ok(terms.length > 0, "search requires terms");

  const matches = inventory.items
    .filter((item) =>
      terms.every((term) =>
        `${item.path} ${item.reason} ${item.localPaths.join(" ")}`
          .toLowerCase()
          .includes(term)
      )
    )
    .toSorted((a, b) => a.path.localeCompare(b.path, "en"));

  assert.ok(matches.length > 0, "No matching adoption records");

  return json
    ? `${JSON.stringify(matches, null, 2)}\n`
    : `${matches.map((item) => `${item.disposition}: ${item.path}\n  ${item.reason}\n  ${item.localPaths.join(", ")}`).join("\n")}\n`;
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
