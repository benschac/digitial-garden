import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { runBunTool } from "./bun-tool.mjs";

const report = JSON.parse(
  readFileSync(
    new URL("../docs/biome-rule-coverage.json", import.meta.url),
    "utf8",
  ),
);
const config = fileURLToPath(new URL("../bunfig.toml", import.meta.url));

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), "personal-site-rule-test-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  copyFileSync(config, join(cwd, "bunfig.toml"));
  return cwd;
}

test("all mapped Biome rules are enabled at their previous severity or higher", (t) => {
  const cwd = fixture(t);
  writeFileSync(join(cwd, "probe.tsx"), "export const value = 1;\n");
  const result = runBunTool("lint", ["--print-config", "probe.tsx"], {
    cwd,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const resolved = JSON.parse(result.stdout);
  const catalogResult = runBunTool("lint", ["--rules", "-f", "json"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(catalogResult.status, 0, catalogResult.stderr);
  const catalog = JSON.parse(catalogResult.stdout);
  const ruleIds = new Map(
    catalog.flatMap(({ id, aliases }) =>
      [id, ...aliases].map((name) => [name, id]),
    ),
  );
  const levels = { warn: 1, error: 2 };
  for (const rule of report.rules) {
    for (const native of rule.nativeRules) {
      assert.ok(
        resolved.rules[ruleIds.get(native)]?.[0] >= levels[rule.severity],
        `${rule.biome} must enable ${native} at ${rule.severity} or higher`,
      );
    }
    if (rule.nativeRules.length === 0)
      assert.ok(rule.note, `Explain the gap for ${rule.biome}`);
  }
});

for (const probe of [
  {
    name: "image alternative text",
    source: 'export const image = <img src="/image.png" />;\n',
    diagnostic: "jsx-a11y/alt-text",
  },
  {
    name: "button type",
    source: "export const button = <button>Save</button>;\n",
    diagnostic: "react/button-has-type",
  },
  {
    name: "raw HTML injection",
    source:
      'export const content = <div dangerouslySetInnerHTML={{ __html: "content" }} />;\n',
    diagnostic: "react/no-danger",
  },
  {
    name: "Next inline script IDs",
    source:
      'import Script from "next/script";\nexport const script = <Script>{"console.log(1)"}</Script>;\n',
    diagnostic: "@next/next/inline-script-id",
  },
  {
    name: "strict equality",
    source: "export const compare = (value: unknown) => value == 1;\n",
    diagnostic: "eqeqeq",
  },
  {
    name: "flatMap identity",
    source: "export const flat = [1, [2]].flatMap((value) => value);\n",
    diagnostic: "unicorn/prefer-array-flat",
  },
  {
    name: "constant Math clamp",
    source: "export const clamped = Math.min(0, Math.max(100, 1));\n",
    diagnostic: "oxc/bad-min-max-func",
  },
  {
    name: "empty type parameters",
    source: "export function empty<>() {}\n",
    diagnostic: "Type parameter list cannot be empty",
  },
]) {
  test(`restores Biome coverage for ${probe.name}`, (t) => {
    const cwd = fixture(t);
    writeFileSync(join(cwd, "probe.tsx"), probe.source);
    const result = runBunTool("lint", ["probe.tsx"], { cwd, encoding: "utf8" });
    assert.equal(result.status, 1, result.stderr);
    assert.ok(
      `${result.stdout}${result.stderr}`.includes(probe.diagnostic),
      `${probe.diagnostic} must be reported: ${result.stdout}${result.stderr}`,
    );
  });
}

test("preserves Biome's intentional loose null comparison exception", (t) => {
  const cwd = fixture(t);
  writeFileSync(
    join(cwd, "probe.ts"),
    "export const isNullish = (value: unknown) => value == null;\n",
  );
  const result = runBunTool("lint", ["probe.ts"], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});
