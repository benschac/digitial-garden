import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { runOxcTool } from "./oxc-tool.mjs";

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

  const result = runOxcTool(
    "lint",
    ["--config", config, "--print-config", "probe.tsx"],
    {
      cwd,
      encoding: "utf-8",
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const resolved = JSON.parse(result.stdout);

  const catalogResult = runOxcTool("lint", ["--rules", "-f", "json"], {
    cwd,
    encoding: "utf-8",
    maxBuffer: 8 * 1024 * 1024,
  });

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

for (const probe of [
  {
    diagnostic: "jsx-a11y(alt-text)",
    name: "image alternative text",
    source: 'export const image = <img src="/image.png" />;\n',
  },
  {
    diagnostic: "react(button-has-type)",
    name: "button type",
    source: "export const button = <button>Save</button>;\n",
  },
  {
    diagnostic: "react(no-danger)",
    name: "raw HTML injection",
    source:
      'export const content = <div dangerouslySetInnerHTML={{ __html: "content" }} />;\n',
  },
  {
    diagnostic: "next(inline-script-id)",
    name: "Next inline script IDs",
    source:
      'import Script from "next/script";\nexport const script = <Script>{"console.log(1)"}</Script>;\n',
  },
  {
    diagnostic: "eqeqeq",
    name: "strict equality",
    source: "export const compare = (value: unknown) => value == 1;\n",
  },
  {
    diagnostic: "unicorn(prefer-array-flat)",
    name: "flatMap identity",
    source: "export const flat = [1, [2]].flatMap((value) => value);\n",
  },
  {
    diagnostic: "oxc(bad-min-max-func)",
    name: "constant Math clamp",
    source: "export const clamped = Math.min(0, Math.max(100, 1));\n",
  },
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
    diagnostic: "Type parameter list cannot be empty",
    name: "empty type parameters",
    source: "export function empty<>() {}\n",
  },
]) {
  test(`reports ${probe.name}`, (t) => {
    const cwd = fixture(t);
    writeFileSync(path.join(cwd, "probe.tsx"), probe.source);

    const result = runOxcTool(
      "lint",
      ["--config", config, "--format=json", "probe.tsx"],
      {
        cwd,
        encoding: "utf-8",
      }
    );

    assert.equal(result.status, 1, result.stderr);
    assert.ok(
      `${result.stdout}${result.stderr}`.includes(probe.diagnostic),
      `${probe.diagnostic} must be reported: ${result.stdout}${result.stderr}`
    );
  });
}

test("preserves Biome's intentional loose null comparison exception", (t) => {
  const cwd = fixture(t);
  writeFileSync(
    path.join(cwd, "probe.ts"),
    "export const isNullish = (value: string | null | undefined) => value == null;\n"
  );

  const result = runOxcTool(
    "lint",
    ["--config", config, "--format=json", "probe.ts"],
    {
      cwd,
      encoding: "utf-8",
    }
  );

  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});
