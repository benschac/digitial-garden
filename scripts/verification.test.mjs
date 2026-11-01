import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const binary = path.join(root, "node_modules/turbo/bin/turbo");
const packages = ["apps/web", "packages/ui", "packages/react-hooks"];

const rootScripts = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf-8")
).scripts;

const checks = [
  "lint",
  "lint:root",
  "format:check",
  "format:root",
  "test:tools",
  "check-types",
  "test",
  "test:content",
];

const createTemplate = () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "personal-site-verification-"));
  after(() => rmSync(cwd, { force: true, recursive: true }));

  const write = (file, source) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), source);
  };

  const git = (...args) => {
    const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
    assert.equal(result.status, 0, result.stderr);
  };

  for (const directory of ["", ...packages]) {
    const manifest = JSON.parse(
      readFileSync(path.join(root, directory, "package.json"), "utf-8")
    );

    for (const name of Object.keys(manifest.scripts)) {
      manifest.scripts[name] =
        `node ${directory ? "../../" : ""}.fixture-probe.mjs ${directory || "root"} ${name}`;
    }

    write(
      `${directory ? `${directory}/` : ""}package.json`,
      JSON.stringify(manifest)
    );

    const configPath = path.join(directory, "turbo.json");

    if (existsSync(path.join(root, configPath))) {
      write(configPath, readFileSync(path.join(root, configPath), "utf-8"));
    }
  }

  copyFileSync(path.join(root, "bun.lock"), path.join(cwd, "bun.lock"));
  write(".gitignore", ".turbo/\n.content-collections/\n.next/\n");
  write(
    ".fixture-probe.mjs",
    `import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("./", import.meta.url));
mkdirSync(root + ".turbo", { recursive: true });
appendFileSync(root + ".turbo/probes.log", process.argv.slice(2).join("#") + "\\n");
if (process.argv[3] === "typegen") {
  mkdirSync(".content-collections/generated", { recursive: true });
  writeFileSync(".content-collections/generated/index.js", "export const posts = [];\\n");
}
`
  );

  for (const directory of packages) {
    write(`${directory}/src/index.ts`, "export const value = 1;\n");
    write(`${directory}/tsconfig.json`, "{}\n");
    write(`${directory}/README.md`, "Baseline\n");
  }

  write("oxlint.config.mts", "export default {};\n");
  write("oxfmt.config.mts", "export default {};\n");
  write("tools/oxlint/anti-slop/index.ts", "export const plugin = 1;\n");
  write("README.md", "Baseline\n");
  git("init", "-q", "--initial-branch=main");
  git("add", ".");
  git(
    "-c",
    "user.name=Verification fixture",
    "-c",
    "user.email=fixture@example.test",
    "-c",
    "commit.gpgsign=false",
    "-c",
    "core.hooksPath=/dev/null",
    "commit",
    "-qm",
    "Baseline"
  );

  return cwd;
};

const template = createTemplate();

const fixture = (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), "personal-site-verification-"));
  t.after(() => rmSync(cwd, { force: true, recursive: true }));
  cpSync(template, cwd, { recursive: true });

  const write = (file, source) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), source);
  };

  const run = (args) => {
    const result = spawnSync(process.execPath, [binary, "run", ...args], {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, TURBO_SCM_BASE: "HEAD", TURBO_SCM_HEAD: "HEAD" },
      timeout: 20_000,
    });

    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);

    return result.stdout;
  };

  const plan = (...tasks) =>
    JSON.parse(run([...tasks, "--affected", "--dry=json"]))
      .tasks.filter((task) => task.command !== "<NONEXISTENT>")
      .map((task) => task.taskId);

  return { cwd, plan, run, write };
};

test("documentation changes select formatting without application checks or builds", (t) => {
  const { plan, write } = fixture(t);
  write("packages/ui/README.md", "Changed documentation\n");
  write("README.md", "Changed root documentation\n");
  const tasks = plan(...checks, "build");
  assert.deepEqual(tasks.toSorted(), [
    "//#format:root",
    "@personal-site/ui#format:check",
  ]);
});

test("shared source selects consumer checks, while Storybook assets do not rebuild the app", (t) => {
  const { plan, write } = fixture(t);
  write("packages/ui/src/index.ts", "export const value = 2;\n");
  const tasks = plan(...checks);
  assert.ok(tasks.includes("@personal-site/ui#check-types"));
  assert.ok(tasks.includes("@personal-site/web#check-types"));
  assert.ok(tasks.includes("@personal-site/web#test"));
  assert.ok(!tasks.includes("@personal-site/web#lint"));
  assert.ok(!tasks.some((task) => task.endsWith("#build")));
  write("packages/ui/src/index.ts", "export const value = 1;\n");
  write("packages/ui/src/stories/assets/demo.png", "export default {};\n");
  const storyTasks = plan(...checks, "build");
  assert.ok(!storyTasks.includes("@personal-site/ui#check-types"));
  assert.ok(!storyTasks.includes("@personal-site/web#build"));
});

test("lint configuration and plugin changes select unchanged source lint tasks", (t) => {
  const { plan, write } = fixture(t);
  write("oxlint.config.mts", "export default { rules: {} };\n");
  write("tools/oxlint/anti-slop/index.ts", "export const plugin = 2;\n");
  const tasks = plan(...checks, "build");

  for (const name of ["web", "ui", "react-hooks"]) {
    assert.ok(tasks.includes(`@personal-site/${name}#lint`));
  }

  assert.ok(!tasks.some((task) => /#(?:test|check-types|build)$/u.test(task)));
});

test("application tests select checks without selecting a production build", (t) => {
  const { plan, write } = fixture(t);
  write("apps/web/src/lib/content/source.test.ts", "export const test = 1;\n");
  const tasks = plan(...checks, "build");
  assert.ok(tasks.includes("@personal-site/web#test"));
  assert.ok(tasks.includes("@personal-site/web#check-types"));
  assert.ok(!tasks.includes("@personal-site/web#build"));
});

test("discovered JSON configurations invalidate lint and formatter tasks", (t) => {
  const { plan, write } = fixture(t);
  write("apps/web/.oxlintrc.json", '{"rules":{"no-console":"error"}}\n');
  assert.ok(plan(...checks).includes("@personal-site/web#lint"));
  write(".oxfmtrc.json", '{"printWidth":100}\n');
  const tasks = plan(...checks);

  for (const name of ["web", "ui", "react-hooks"]) {
    assert.ok(tasks.includes(`@personal-site/${name}#format:check`));
  }
});

test("authored content selects generation and its application consumers", (t) => {
  const { plan, write } = fixture(t);
  write("apps/web/content/posts/example.mdx", "# Authored content\n");
  const tasks = plan(...checks, "build");
  assert.ok(tasks.includes("@personal-site/web#typegen"));
  assert.ok(tasks.includes("@personal-site/web#test"));
  assert.ok(tasks.includes("@personal-site/web#check-types"));
  assert.ok(tasks.includes("@personal-site/web#build"));
});

test("content generation is shared and unchanged successful tasks hit cache", (t) => {
  const { cwd, run, write } = fixture(t);
  write("apps/web/src/index.ts", "export const value = 2;\n");
  run([...checks, "--affected"]);
  const log = path.join(cwd, ".turbo/probes.log");
  const first = readFileSync(log, "utf-8");
  assert.equal(first.split("apps/web#typegen").length - 1, 1);
  assert.ok(!first.includes("#build\n"));
  rmSync(path.join(cwd, "apps/web/.content-collections"), { recursive: true });
  run([...checks, "--affected"]);
  assert.equal(readFileSync(log, "utf-8"), first);
  assert.equal(
    readFileSync(
      path.join(cwd, "apps/web/.content-collections/generated/index.js"),
      "utf-8"
    ),
    "export const posts = [];\n"
  );

  write("apps/web/src/components/button.tsx", "export const Button = 1;\n");
  run([...checks, "--affected"]);
  const updated = readFileSync(log, "utf-8");
  assert.equal(updated.split("apps/web#typegen").length - 1, 1);
  assert.equal(updated.split("apps/web#check-types").length - 1, 2);
  assert.equal(updated.split("apps/web#test\n").length - 1, 2);
});

test("standalone typechecks and tests use affected selection with explicit full alternatives", (t) => {
  const { run, write } = fixture(t);
  write("packages/ui/README.md", "Changed documentation\n");

  for (const name of ["check-types", "test"]) {
    const args = rootScripts[name].split(" ").slice(2);
    const { tasks } = JSON.parse(run([...args, "--dry=json"]));
    assert.deepEqual(
      tasks.filter((task) => task.command !== "<NONEXISTENT>"),
      []
    );
    const allArgs = rootScripts[`${name}:all`].split(" ").slice(2);
    const allTasks = JSON.parse(run([...allArgs, "--dry=json"])).tasks;
    assert.ok(allTasks.some((task) => task.taskId.endsWith(`#${name}`)));

    if (name === "test") {
      assert.ok(allTasks.some((task) => task.taskId.endsWith("#test:content")));
    }
  }
});

test("application source checks stay within the consumer package", (t) => {
  const { plan, write } = fixture(t);
  write("apps/web/src/components/button.tsx", "export const Button = 1;\n");
  const tasks = plan(...checks);
  assert.ok(tasks.includes("@personal-site/web#check-types"));
  assert.ok(tasks.includes("@personal-site/web#test"));
  assert.ok(tasks.every((task) => task.startsWith("@personal-site/web#")));
  assert.deepEqual(plan("typegen"), []);
  assert.ok(!tasks.includes("@personal-site/web#test:content"));
});

test("styles and public assets do not select syntax-only lint", (t) => {
  const { plan, write } = fixture(t);
  write("apps/web/src/app/globals.css", "body { color: red; }\n");
  write("apps/web/public/example.png", "image\n");
  const tasks = plan(...checks);
  assert.ok(tasks.includes("@personal-site/web#format:check"));
  assert.ok(!tasks.some((task) => task.endsWith("#lint")));
});

for (const file of [
  "apps/web/src/app/example/page.tsx",
  "apps/web/src/lib/content/schema.ts",
  "apps/web/agent/index.ts",
  "apps/web/next.config.mjs",
  "apps/web/content/posts/example.mdx",
  "apps/web/public/example.png",
]) {
  test(`generation remains affected by ${file}`, (t) => {
    const { plan, write } = fixture(t);
    write(file, "changed\n");
    assert.ok(plan("typegen").includes("@personal-site/web#typegen"));
  });
}

for (const file of [
  "apps/web/content/posts/example.mdx",
  "apps/web/src/lib/content/schema.ts",
  "apps/web/public/example.png",
]) {
  test(`repository post validation remains affected by ${file}`, (t) => {
    const { plan, write } = fixture(t);
    write(file, "changed\n");
    assert.ok(plan(...checks).includes("@personal-site/web#test:content"));
  });
}
