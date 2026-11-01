import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
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

const binary = fileURLToPath(
  new URL("../node_modules/oxlint/bin/oxlint", import.meta.url)
);

const config = fileURLToPath(new URL("../oxlint.config.mts", import.meta.url));

for (const probe of [
  {
    file: "apps/web/src/probe.mjs",
    rejected: true,
    source: 'export { value } from "../../../packages/ui/src/lib/utils";',
  },
  {
    file: "packages/ui/src/probe.mts",
    rejected: true,
    source: 'export { value } from "@personal-site/web";',
  },
  {
    file: "apps/web/src/probe.ts",
    rejected: true,
    source: 'export { value } from "../../../packages/ui/src";',
  },
  {
    file: "apps/web/src/probe.ts",
    rejected: true,
    source: 'export { value } from "@personal-site/ui/src";',
  },
  {
    file: "packages/ui/src/probe.ts",
    rejected: true,
    source: 'export { value } from "@/lib/value";',
  },
  {
    file: "packages/ui/src/probe.ts",
    rejected: true,
    source: 'export { value } from "../../../apps/web/src/lib/value";',
  },
  {
    file: "packages/react-hooks/src/probe.ts",
    rejected: true,
    source: 'export { value } from "@personal-site/web";',
  },
  {
    file: "apps/web/src/probe.ts",
    rejected: true,
    source: 'export { value } from "@personal-site/ui/src/lib/utils";',
  },
  {
    file: "apps/web/src/probe.ts",
    rejected: true,
    source: 'export { value } from "../../../packages/ui/src/lib/utils";',
  },
  {
    file: "apps/web/src/probe.ts",
    rejected: false,
    source: 'export { cn } from "@personal-site/ui/lib/utils";',
  },
  {
    file: "packages/ui/src/probe.ts",
    rejected: false,
    source: 'export { value } from "./value";',
  },
  ...["ignore", "nocheck", "expect-error"].map((directive) => ({
    file: "apps/web/src/probe.ts",
    rejected: true,
    source: `// @ts-${directive}\nexport const value = 1;`,
  })),
]) {
  test(`${probe.rejected ? "rejects" : "accepts"} ${probe.file}: ${probe.source}`, (t) => {
    const cwd = mkdtempSync(path.join(tmpdir(), "personal-site-fence-"));
    t.after(() => rmSync(cwd, { force: true, recursive: true }));
    copyFileSync(config, path.join(cwd, "oxlint.config.mts"));

    for (const directory of ["node_modules", "tools"]) {
      symlinkSync(
        fileURLToPath(new URL(`../${directory}`, import.meta.url)),
        path.join(cwd, directory)
      );
    }

    const file = path.join(cwd, probe.file);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${probe.source}\n`);

    const result = spawnSync(
      process.execPath,
      [
        binary,
        "--config",
        path.join(cwd, "oxlint.config.mts"),
        "--format=json",
        probe.file,
      ],
      { cwd, encoding: "utf-8" }
    );

    assert.equal(
      result.status,
      probe.rejected ? 1 : 0,
      `${result.stdout}${result.stderr}`
    );

    if (probe.rejected) {
      assert.match(result.stdout, /no-restricted-imports|ban-ts-comment/u);
    }
  });
}
