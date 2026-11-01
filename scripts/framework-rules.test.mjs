import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
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
import { fileURLToPath } from "node:url";

const binary = fileURLToPath(
  new URL("../node_modules/oxlint/bin/oxlint", import.meta.url)
);

const config = fileURLToPath(new URL("../oxlint.config.mts", import.meta.url));

const probes = [
  {
    file: "apps/web/src/app/experiments/typegpu-particles/typegpu-particle-shaders.ts",
    rejected: false,
    rule: "sort-keys",
    source: "export const layout = { z: 1, a: 2 };",
  },
  {
    file: "apps/web/src/probe.ts",
    rejected: true,
    rule: "sort-keys",
    source: "export const layout = { z: 1, a: 2 };",
  },
  {
    file: "apps/web/src/lib/perlin-noise.ts",
    rejected: false,
    rule: "no-bitwise",
    source: "export const mask = (value: number) => value & 255;",
  },
  {
    file: "apps/web/src/probe.ts",
    rejected: true,
    rule: "no-bitwise",
    source: "export const mask = (value: number) => value & 255;",
  },
  {
    file: "packages/ui/src/index.ts",
    rejected: false,
    rule: "no-barrel-file",
    source: 'export * from "@base-ui/react";',
  },
  {
    file: "packages/ui/src/probe.ts",
    rejected: true,
    rule: "no-barrel-file",
    source: 'export * from "@base-ui/react";',
  },
  {
    file: "apps/web/src/app/experiments/wasm-canvas/wasm-canvas.tsx",
    rejected: false,
    rule: "prefer-tag-over-role",
    source:
      'export const image = <canvas role="img" aria-label="Particles" />;',
  },
  {
    file: "apps/web/src/probe.tsx",
    rejected: true,
    rule: "prefer-tag-over-role",
    source:
      'export const image = <canvas role="img" aria-label="Particles" />;',
  },
];

const fixture = (t, file, source) => {
  const cwd = mkdtempSync(
    path.join(tmpdir(), "personal-site-framework-rules-")
  );

  t.after(() => rmSync(cwd, { force: true, recursive: true }));
  copyFileSync(config, path.join(cwd, "oxlint.config.mts"));

  for (const directory of ["node_modules", "tools"]) {
    symlinkSync(
      fileURLToPath(new URL(`../${directory}`, import.meta.url)),
      path.join(cwd, directory)
    );
  }

  if (file.startsWith("packages/ui/")) {
    mkdirSync(path.join(cwd, "packages/ui"), { recursive: true });
    symlinkSync(
      fileURLToPath(new URL("../packages/ui/node_modules", import.meta.url)),
      path.join(cwd, "packages/ui/node_modules")
    );
  }

  const target = path.join(cwd, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${source}\n`);

  return { cwd, target };
};

test("enforces framework rules outside their scoped adaptations", async (t) => {
  const files = probes.map((probe, index) =>
    probe.file.includes("/probe.")
      ? probe.file.replace("/probe.", `/probe-${index}.`)
      : probe.file
  );

  const [first] = probes;
  const { cwd } = fixture(t, files[0], first.source);

  for (const [index, probe] of probes.entries()) {
    const target = path.join(cwd, files[index]);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, `${probe.source}\n`);
  }

  mkdirSync(path.join(cwd, "packages/ui"), { recursive: true });
  symlinkSync(
    fileURLToPath(new URL("../packages/ui/node_modules", import.meta.url)),
    path.join(cwd, "packages/ui/node_modules")
  );

  const result = spawnSync(
    process.execPath,
    [binary, "--format=json", ...files],
    { cwd, encoding: "utf-8" }
  );

  assert.equal(result.status, 1, `${result.stdout}${result.stderr}`);
  const { diagnostics } = JSON.parse(result.stdout);

  await Promise.all(
    probes.map((probe, index) =>
      t.test(
        `${probe.rejected ? "enforces" : "adapts"} ${probe.rule} in ${probe.file}`,
        () => {
          assert.equal(
            diagnostics.some(
              (diagnostic) =>
                diagnostic.filename === files[index] &&
                diagnostic.code?.includes(`(${probe.rule})`)
            ),
            probe.rejected,
            result.stdout
          );
        }
      )
    )
  );
});

test("safe fixes preserve Effect's tagged error factory call", (t) => {
  const file = "apps/web/agent/lib/sample-db.ts";

  const { cwd, target } = fixture(
    t,
    file,
    'import { Schema } from "effect";\n\nexport class Failure extends Schema.TaggedError<Failure>()("Failure", {}) {}'
  );

  const result = spawnSync(
    process.execPath,
    [binary, "--fix", "--format=json", file],
    {
      cwd,
      encoding: "utf-8",
    }
  );

  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.match(readFileSync(target, "utf-8"), /extends Schema\.TaggedError/u);
  assert.doesNotMatch(
    readFileSync(target, "utf-8"),
    /new Schema\.TaggedError/u
  );
});

test("ordinary error construction still requires new", (t) => {
  const file = "apps/web/src/probe.ts";
  const { cwd } = fixture(t, file, 'export const failure = Error("failure");');

  const result = spawnSync(process.execPath, [binary, "--format=json", file], {
    cwd,
    encoding: "utf-8",
  });

  assert.match(result.stdout, /throw-new-error/u);
});

test("workspace manifests use Oxlint and Oxfmt without ESLint dependencies", () => {
  for (const directory of [
    ".",
    "apps/web",
    "packages/ui",
    "packages/react-hooks",
  ]) {
    const manifest = JSON.parse(
      readFileSync(
        new URL(`../${directory}/package.json`, import.meta.url),
        "utf-8"
      )
    );

    for (const name of Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    })) {
      assert.doesNotMatch(
        name,
        /^(?:eslint(?:$|-)|@eslint\/|@typescript-eslint\/)/u,
        `${directory}: ${name}`
      );
    }

    for (const command of Object.values(manifest.scripts)) {
      assert.doesNotMatch(command, /\beslint\b/u, `${directory}: ${command}`);
    }
  }
});
