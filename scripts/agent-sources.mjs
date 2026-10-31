import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));

export const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf-8",
    maxBuffer: 8 * 1024 * 1024,
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} failed: ${result.error?.message ?? result.stderr}`
    );
  }

  return result.stdout.trim();
};

const validatePackages = (directory, source) => {
  for (const dependency of source.packages) {
    const actual = readJson(path.join(directory, dependency.path));

    if (
      actual.name !== dependency.name ||
      actual.version !== dependency.version
    ) {
      throw new Error(
        `${source.name}: ${dependency.path} must be ${dependency.name}@${dependency.version}; found ${actual.name}@${actual.version}`
      );
    }
  }
};

export const checkSource = (directory, source) => {
  const metadata = readJson(path.join(directory, ".agent-source.json"));
  const head = run("git", ["rev-parse", "HEAD"], directory);

  const ref = run(
    "git",
    ["rev-parse", `refs/tags/${source.ref}^{commit}`],
    directory
  );

  const origin = run("git", ["remote", "get-url", "origin"], directory);

  if (
    metadata.repository !== source.repository ||
    metadata.ref !== source.ref ||
    metadata.commit !== head ||
    head !== source.commit ||
    head !== ref ||
    origin !== source.repository ||
    JSON.stringify(metadata.packages) !== JSON.stringify(source.packages)
  ) {
    throw new Error(
      `${source.name}: mirror does not match the reference manifest. Preserve it and move it aside before fetching a new mirror.`
    );
  }

  const dirty = run(
    "git",
    [
      "status",
      "--porcelain",
      "--untracked-files=all",
      "--",
      ".",
      ":(exclude).agent-source.json",
    ],
    directory
  );

  if (dirty) {
    throw new Error(
      `${source.name}: mirror has local changes. Preserve them before fetching a new mirror.`
    );
  }

  validatePackages(directory, source);

  return metadata;
};

export const fetchSource = (cache, source) => {
  const destination = path.join(cache, source.name);

  if (existsSync(destination)) {
    return checkSource(destination, source);
  }

  mkdirSync(cache, { recursive: true });
  const staging = mkdtempSync(path.join(cache, ".fetch-"));
  const checkout = path.join(staging, "checkout");

  try {
    run(
      "git",
      [
        "clone",
        "--depth",
        "1",
        "--branch",
        source.ref,
        "--",
        source.repository,
        checkout,
      ],
      cache
    );
    validatePackages(checkout, source);

    const metadata = {
      commit: run("git", ["rev-parse", "HEAD"], checkout),
      packages: source.packages,
      ref: source.ref,
      repository: source.repository,
      retrievedAt: new Date().toISOString(),
    };

    writeFileSync(
      path.join(checkout, ".agent-source.json"),
      `${JSON.stringify(metadata, null, 2)}\n`
    );
    checkSource(checkout, source);
    renameSync(checkout, destination);

    return metadata;
  } finally {
    rmSync(staging, { force: true, recursive: true });
  }
};

export const validateInstalled = (root, sources) => {
  const manifest = readJson(path.join(root, "apps/web/package.json"));

  for (const source of sources) {
    for (const dependency of source.packages) {
      const declared =
        manifest.dependencies?.[dependency.name] ??
        manifest.devDependencies?.[dependency.name];

      if (declared) {
        const installed = readJson(
          path.join(
            root,
            "apps/web/node_modules",
            dependency.name,
            "package.json"
          )
        );

        if (
          declared !== dependency.version ||
          installed.version !== dependency.version
        ) {
          throw new Error(
            `${dependency.name}: declared (${declared}), installed (${installed.version}), and source reference (${dependency.version}) must match. Review the source manifest after dependency changes.`
          );
        }
      }
    }
  }
};

export const main = (root, command = "fetch") => {
  if (!["fetch", "check", "updates"].includes(command)) {
    throw new Error(
      "Usage: node scripts/agent-sources.mjs [fetch|check|updates]"
    );
  }

  const sources = readJson(path.join(root, "scripts/agent-sources.json"));
  validateInstalled(root, sources);

  for (const source of sources) {
    if (command === "updates") {
      for (const dependency of source.packages) {
        const tags = run(
          "npm",
          ["view", dependency.name, "dist-tags", "--json"],
          root
        );

        process.stdout.write(
          `${dependency.name}: reference ${dependency.version}; published channels ${tags}\n`
        );
      }
    } else {
      const cache = path.join(root, ".agent_sources");

      const metadata =
        command === "fetch"
          ? fetchSource(cache, source)
          : checkSource(path.join(cache, source.name), source);

      process.stdout.write(
        `${source.name}: ${metadata.ref} @ ${metadata.commit}\n`
      );
    }
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    if (process.argv.length > 3) {
      throw new Error(
        "Expected at most one command: fetch, check, or updates."
      );
    }

    main(fileURLToPath(new URL("..", import.meta.url)), process.argv[2]);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
