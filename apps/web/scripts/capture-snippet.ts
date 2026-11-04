import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { Schema } from "effect";
import { execa } from "execa";

import {
  parseSnippetSnapshot,
  snippetIdSchema,
  snippetSnapshotSchema,
  sourceBlobHash,
} from "../src/lib/content/source-snippets";

const captureSchema = Schema.Struct({
  commit: snippetSnapshotSchema.fields.commit,
  id: snippetIdSchema,
  localRepository: Schema.NonEmptyString,
  repository: snippetSnapshotSchema.fields.repository,
  sourcePath: snippetSnapshotSchema.fields.path,
});

const parseCapture = Schema.decodeUnknownSync(captureSchema);

export const captureSnippet = async (
  input: typeof captureSchema.Type,
  outputDirectory = path.join(import.meta.dir, "../content/snippets")
) => {
  const request = parseCapture(input);
  const cwd = await realpath(request.localRepository);

  const git = async (...args: string[]) => {
    const result = await execa("git", ["--no-replace-objects", ...args], {
      cwd,
      maxBuffer: 1024 * 1024,
      stripFinalNewline: false,
      timeout: 10_000,
    });

    return result.stdout;
  };

  const remoteUrl = await git("remote", "get-url", "origin");

  const origin = remoteUrl
    .trim()
    .replace(/^git@github\.com:/u, "https://github.com/")
    .replace(/\.git$/u, "");

  if (origin !== request.repository) {
    throw new Error(`Repository URL does not match origin ${origin}.`);
  }

  const objectType = await git("cat-file", "-t", request.commit);

  if (objectType.trim() !== "commit") {
    throw new Error("The pin must identify a Git commit.");
  }

  const entry = await git(
    "ls-tree",
    "-z",
    request.commit,
    "--",
    request.sourcePath
  );

  const regularFile = /^100(?:644|755) blob [a-f0-9]{40}\t[^\0]+\0$/u.test(
    entry
  );

  const fields = entry.replace(/\0$/u, "").split(/\s+/u);
  const [blob, sourcePath] = fields.slice(2);

  if (!regularFile || !blob || sourcePath !== request.sourcePath) {
    throw new Error(
      "The source path must identify one regular file at the pinned commit."
    );
  }

  const content = await git("cat-file", "blob", blob);

  if (sourceBlobHash(content) !== blob || content.includes("\0")) {
    throw new Error("The source must be a UTF-8 text file.");
  }

  const snapshot = parseSnippetSnapshot({
    blob,
    commit: request.commit,
    content,
    path: request.sourcePath,
    repository: request.repository,
  });

  await mkdir(outputDirectory, { recursive: true });

  const directoryStat = await lstat(outputDirectory);

  if (directoryStat.isSymbolicLink()) {
    throw new Error("Snapshot directory must not be a symbolic link.");
  }

  const output = path.join(outputDirectory, `${request.id}.json`);

  const temporaryDirectory = await mkdtemp(
    path.join(outputDirectory, ".capture-")
  );

  try {
    const temporaryFile = path.join(temporaryDirectory, "snapshot.json");
    await writeFile(temporaryFile, `${JSON.stringify(snapshot, null, 2)}\n`, {
      flag: "wx",
    });
    await link(temporaryFile, output);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }

  return output;
};

if (import.meta.main) {
  const [id, localRepository, commit, sourcePath, repository, ...extra] =
    process.argv.slice(2);

  if (extra.length || !repository) {
    throw new Error(
      "Usage: bun run snippets:capture <id> <local-repo> <commit> <path> <https://github.com/owner/repo>"
    );
  }

  console.log(
    await captureSnippet(
      parseCapture({
        commit,
        id,
        localRepository,
        repository,
        sourcePath,
      })
    )
  );
}
