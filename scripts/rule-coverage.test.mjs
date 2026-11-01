import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const binary = fileURLToPath(
  new URL("../node_modules/oxlint/bin/oxlint", import.meta.url)
);

const report = JSON.parse(
  readFileSync(
    new URL("../docs/biome-rule-coverage.json", import.meta.url),
    "utf-8"
  )
);

const config = fileURLToPath(new URL("../oxlint.config.mts", import.meta.url));

const canonicalRule = (name) =>
  name
    .replace(/^@next\/next\//u, "nextjs/")
    .replace(/^react-hooks\//u, "react/")
    .replace(/^jsx-a11y\//u, "jsx_a11y/");

const fixture = (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), "personal-site-rule-test-"));
  t.after(() => rmSync(cwd, { force: true, recursive: true }));

  return cwd;
};

test("all mapped Biome rules are enabled at their previous severity or higher", (t) => {
  const cwd = fixture(t);
  writeFileSync(path.join(cwd, "probe.tsx"), "export const value = 1;\n");

  const result = spawnSync(
    process.execPath,
    [binary, "--config", config, "--print-config", "probe.tsx"],
    {
      cwd,
      encoding: "utf-8",
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const resolved = JSON.parse(result.stdout);

  const catalogResult = spawnSync(
    process.execPath,
    [binary, "--rules", "-f", "json"],
    {
      cwd,
      encoding: "utf-8",
      maxBuffer: 8 * 1024 * 1024,
    }
  );

  assert.equal(catalogResult.status, 0, catalogResult.stderr);
  const catalog = JSON.parse(catalogResult.stdout);

  const ruleIds = new Set(
    catalog.map(({ scope, value }) =>
      scope === "eslint" ? value : `${scope}/${value}`
    )
  );

  const levels = { allow: 0, deny: 2, error: 2, off: 0, warn: 1 };

  for (const rule of report.rules) {
    for (const native of rule.nativeRules) {
      const normalized = canonicalRule(native);

      const canonical = ruleIds.has(normalized)
        ? normalized
        : normalized.replace(/^typescript\//u, "");

      assert.ok(ruleIds.has(canonical), `${native} must exist in Oxlint`);
      const configured = resolved.rules[canonical];
      const severity = Array.isArray(configured) ? configured[0] : configured;
      const level = levels[severity] ?? severity;
      assert.ok(
        level >= levels[rule.severity],
        `${rule.biome} must enable ${native} at ${rule.severity} or higher`
      );
    }

    if (rule.nativeRules.length === 0) {
      assert.ok(rule.note, `Explain the gap for ${rule.biome}`);
    }
  }
});

const probes = [
  {
    diagnostic: "anti-slop(no-array-filter-map)",
    name: "anti-slop array traversal",
    source:
      "export const doubled = [1, 2].filter((value) => value > 1).map((value) => value * 2);\n",
  },
  {
    diagnostic: "anti-slop-effect(no-manual-tag-comparison)",
    name: "anti-slop Effect tagged comparisons",
    source:
      'export const ready = (value: { _tag: "Ready" | "Pending" }) => value._tag === "Ready";\n',
  },
  {
    diagnostic: undefined,
    name: "Biome's intentional loose null comparison exception",
    source:
      "export const isNullish = (value: string | null | undefined) => value == null;\n",
  },
];

test("preserves behavioral rule coverage", async (t) => {
  const cwd = fixture(t);

  const files = probes.map((probe, index) => {
    const file = `probe-${index}.tsx`;
    writeFileSync(path.join(cwd, file), probe.source);

    return file;
  });

  const result = spawnSync(
    process.execPath,
    [binary, "--config", config, "--format=json", ...files],
    { cwd, encoding: "utf-8" }
  );

  assert.equal(result.status, 1, `${result.stdout}${result.stderr}`);
  const { diagnostics } = JSON.parse(result.stdout);

  await Promise.all(
    probes.map((probe, index) =>
      t.test(
        probe.diagnostic ? `reports ${probe.name}` : `preserves ${probe.name}`,
        () => {
          const actual = diagnostics.filter(
            (diagnostic) => diagnostic.filename === files[index]
          );

          if (probe.diagnostic) {
            assert.ok(
              actual.some((diagnostic) => diagnostic.code === probe.diagnostic),
              JSON.stringify(actual)
            );
          } else {
            assert.deepEqual(actual, []);
          }
        }
      )
    )
  );
});
