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

const probes = [
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
];

test("enforces repository import and suppression boundaries", async (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), "personal-site-fence-"));
  t.after(() => rmSync(cwd, { force: true, recursive: true }));
  copyFileSync(config, path.join(cwd, "oxlint.config.mts"));

  for (const directory of ["node_modules", "tools"]) {
    symlinkSync(
      fileURLToPath(new URL(`../${directory}`, import.meta.url)),
      path.join(cwd, directory)
    );
  }

  const files = probes.map((probe, index) => {
    const extension = path.extname(probe.file);
    const file = probe.file.replace(extension, `-${index}${extension}`);
    const target = path.join(cwd, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, `${probe.source}\n`);

    return file;
  });

  const result = spawnSync(
    process.execPath,
    [
      binary,
      "--config",
      path.join(cwd, "oxlint.config.mts"),
      "--format=json",
      ...files,
    ],
    { cwd, encoding: "utf-8" }
  );

  assert.equal(result.status, 1, `${result.stdout}${result.stderr}`);
  const { diagnostics } = JSON.parse(result.stdout);

  await Promise.all(
    probes.map((probe, index) =>
      t.test(
        `${probe.rejected ? "rejects" : "accepts"} ${probe.file}: ${probe.source}`,
        () => {
          const actual = diagnostics.filter(
            (diagnostic) => diagnostic.filename === files[index]
          );

          assert.equal(
            actual.length > 0,
            probe.rejected,
            JSON.stringify(actual)
          );

          if (probe.rejected) {
            assert.ok(
              actual.some((diagnostic) =>
                /no-restricted-imports|ban-ts-comment/u.test(diagnostic.code)
              ),
              JSON.stringify(actual)
            );
          }
        }
      )
    )
  );
});
