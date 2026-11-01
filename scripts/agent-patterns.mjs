import { readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { checkSource, validateInstalled } from "./agent-sources.mjs";

const requireValue = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const text = (value) =>
  Object.prototype.toString.call(value) === "[object String]" &&
  value.trim().length > 0;

const recordFields = (value, keys, label) => {
  requireValue(
    value &&
      Object.prototype.toString.call(value) === "[object Object]" &&
      !Array.isArray(value),
    `${label}: expected object`
  );
  requireValue(
    Object.keys(value).toSorted().join(",") === [...keys].toSorted().join(","),
    `${label}: unexpected or missing fields`
  );
};

const strings = (value, label, nonempty = true) => {
  requireValue(
    Array.isArray(value) &&
      (!nonempty || value.length > 0) &&
      value.every(text),
    `${label}: expected strings`
  );
  requireValue(
    new Set(value).size === value.length,
    `${label}: duplicate values`
  );
};

const safePath = (value) => {
  requireValue(
    text(value) &&
      !path.isAbsolute(value) &&
      !value.includes("\\") &&
      !value.includes(":") &&
      value.split("/").every((part) => part && part !== "." && part !== ".."),
    `Unsafe path: ${value}`
  );
};

const file = (root, value) => {
  safePath(value);
  const base = realpathSync(root);
  const target = realpathSync(path.join(base, value));
  requireValue(
    target.startsWith(`${base}${path.sep}`) && statSync(target).isFile(),
    `File outside root or not a file: ${value}`
  );
};

const readJson = (filename) => JSON.parse(readFileSync(filename, "utf-8"));

const validateSources = (root, entry, sources, mirrors, allowStale) => {
  requireValue(Array.isArray(entry.sources), `${entry.id}: expected sources`);
  const names = new Set();

  for (const source of entry.sources) {
    recordFields(source, ["name", "commit", "paths"], `${entry.id}.source`);

    requireValue(
      text(source.commit) && /^[a-f0-9]{40}$/u.test(source.commit),
      `${entry.id}: invalid source commit`
    );

    const pinned = sources.find((candidate) => candidate.name === source.name);

    requireValue(
      pinned &&
        (allowStale || pinned.commit === source.commit) &&
        !names.has(source.name),
      `${entry.id}: stale or unknown source ${source.name}; revalidate affected patterns`
    );
    names.add(source.name);
    strings(source.paths, `${entry.id}.source.paths`);

    for (const sourcePath of source.paths) {
      safePath(sourcePath);

      if (mirrors) {
        file(path.join(root, ".agent_sources", source.name), sourcePath);
      }
    }
  }
};

export const validateCatalog = (
  root,
  entries,
  sources,
  mirrors = false,
  allowStale = false
) => {
  requireValue(
    Array.isArray(entries) && entries.length > 0,
    "Catalog must contain entries"
  );
  const ids = new Set();

  for (const entry of entries) {
    recordFields(
      entry,
      [
        "id",
        "title",
        "concerns",
        "decision",
        "owners",
        "sources",
        "references",
        "checks",
        "exceptions",
        "gaps",
        "related",
      ],
      "entry"
    );
    requireValue(
      text(entry.id) &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.id) &&
        !ids.has(entry.id),
      `Invalid or duplicate id: ${entry.id}`
    );
    ids.add(entry.id);
    requireValue(
      text(entry.title) && text(entry.decision),
      `${entry.id}: missing title or decision`
    );

    for (const key of [
      "concerns",
      "owners",
      "references",
      "exceptions",
      "gaps",
      "related",
    ]) {
      strings(
        entry[key],
        `${entry.id}.${key}`,
        !["references", "gaps", "related"].includes(key)
      );
    }

    for (const owner of entry.owners) {
      file(root, owner);
    }

    for (const reference of entry.references) {
      const url = new URL(reference);
      requireValue(
        url.protocol === "https:" && !url.username && !url.password,
        `Invalid reference: ${reference}`
      );
    }

    validateSources(root, entry, sources, mirrors, allowStale);

    requireValue(
      Array.isArray(entry.checks) && entry.checks.length > 0,
      `${entry.id}: expected checks`
    );

    for (const check of entry.checks) {
      recordFields(check, ["kind", "path", "claim"], `${entry.id}.check`);
      requireValue(
        ["lint", "behavior", "static"].includes(check.kind) &&
          text(check.claim),
        `${entry.id}: invalid check`
      );
      file(root, check.path);
    }
  }

  for (const entry of entries) {
    for (const related of entry.related) {
      requireValue(
        ids.has(related) && related !== entry.id,
        `${entry.id}: invalid related pattern ${related}`
      );
    }
  }

  return entries;
};

export const search = (entries, query) => {
  const terms = [...new Set(query.toLowerCase().match(/[a-z0-9]+/gu))];

  requireValue(terms.length > 0, "Search requires terms");

  return entries
    .map((entry) => ({
      entry,
      score: terms.reduce(
        (sum, term) =>
          sum +
          [
            entry.id,
            entry.title,
            entry.concerns.join(" "),
            entry.decision,
          ].reduce(
            (total, field, index) =>
              total + (field.toLowerCase().includes(term) ? 4 - index : 0),
            0
          ),
        0
      ),
    }))
    .filter(({ score }) => score > 0)
    .toSorted(
      (a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id, "en")
    )
    .map(({ entry }) => entry);
};

export const main = (root, args) => {
  const json = args.includes("--json");
  const [command = "list", ...values] = args.filter((arg) => arg !== "--json");
  requireValue(
    ["list", "search", "show", "check", "check-sources", "affected"].includes(
      command
    ),
    "Expected list, search, show, check, check-sources, or affected"
  );
  requireValue(
    !json || !command.startsWith("check"),
    "--json is only supported for retrieval commands"
  );
  requireValue(
    !["list", "check", "check-sources"].includes(command) ||
      values.length === 0,
    `${command} takes no arguments`
  );
  const sources = readJson(path.join(root, "scripts/agent-sources.json"));
  const raw = readJson(path.join(root, "agent-patterns/catalog.json"));

  if (command === "check-sources") {
    validateInstalled(root, sources);

    for (const source of sources) {
      checkSource(path.join(root, ".agent_sources", source.name), source);
    }
  }

  if (command === "check") {
    validateInstalled(root, sources);
  }

  const entries = validateCatalog(
    root,
    raw,
    sources,
    command === "check-sources",
    command === "affected"
  );

  let result = [...entries].toSorted((a, b) => a.id.localeCompare(b.id, "en"));

  if (command === "search") {
    result = search(entries, values.join(" "));
  }

  if (command === "show") {
    requireValue(values.length === 1, "show requires one id");
    result = entries.filter((entry) => entry.id === values[0]);
  }

  if (command === "affected") {
    requireValue(
      values.length > 0 &&
        values.every((name) => sources.some((source) => source.name === name)),
      "affected requires known source names"
    );
    result = result.filter((entry) =>
      entry.sources.some((source) => values.includes(source.name))
    );
  }

  requireValue(
    !["search", "show"].includes(command) || result.length > 0,
    "No matching patterns"
  );

  if (command.startsWith("check")) {
    return `Validated ${entries.length} patterns${command === "check-sources" ? " and mirror references" : ""}\n`;
  }

  if (json) {
    return `${JSON.stringify(result, null, 2)}\n`;
  }

  return `${result.map((entry) => (command === "show" ? JSON.stringify(entry, null, 2) : `${entry.id}: ${entry.title}`)).join("\n")}\n`;
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
