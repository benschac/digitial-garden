import { afterEach, expect, test } from "bun:test";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createBuilder } from "@content-collections/core";
import { evaluate } from "@mdx-js/mdx";
import rehypeShiki from "@shikijs/rehype";
import { execa } from "execa";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";

import { captureSnippet } from "../../../scripts/capture-snippet";
import { prepareSourceSnippets, sourceBlobHash } from "./source-snippets";

const temporaryDirectories: string[] = [];
const commit = "a".repeat(40);
const repository = "https://github.com/example/source";
const reference = "```ts source=example lines=2-3\n```";

const source =
  "/* opening\nstill a comment\nstill a comment too\n*/\nconst hidden = 1;\n";

const fixture = async (content = source) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "source-snippets-"));
  temporaryDirectories.push(directory);

  const snapshot = {
    blob: sourceBlobHash(content),
    commit,
    content,
    path: "src/example.ts",
    repository,
  };

  await writeFile(
    path.join(directory, "example.json"),
    JSON.stringify(snapshot)
  );

  return { directory, snapshot };
};

const render = async (content: string, directory: string) => {
  const prepared = await prepareSourceSnippets(content, directory, "post.mdx");

  const { default: Content } = await evaluate(prepared.content, {
    ...jsxRuntime,
    rehypePlugins: [
      [
        rehypeShiki,
        { theme: "github-dark-dimmed", transformers: [prepared.transformer] },
      ],
    ],
  });

  return renderToStaticMarkup(createElement(Content));
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  );
});

test("renders selected source with full-file lexical context and a pinned permalink", async () => {
  const { directory } = await fixture();
  const html = await render(reference, directory);
  expect(html).toContain(
    'href="https://github.com/example/source/blob/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/src/example.ts#L2-L3"'
  );
  expect(html).toContain("src/example.ts:2-3 at aaaaaaaaaaaa");
  expect(html).toContain('<span style="color:#768390">still a comment</span>');
  expect(html).toContain("still a comment too");
  expect(html).not.toContain("opening");
  expect(html).not.toContain("hidden");
});

test("keeps literal fences unchanged and does not require a snapshot directory", async () => {
  const content = "```ts\nconst value = 1;\n```";

  const prepared = await prepareSourceSnippets(
    content,
    "/missing-snapshots",
    "post.mdx"
  );

  expect(prepared.content).toBe(content);
  expect(await render(content, "/missing-snapshots")).not.toContain(
    "figcaption"
  );
});

test("preserves source indentation in indented top-level fences", async () => {
  const { directory } = await fixture("function sample() {\n  return 1;\n}\n");

  await Promise.all(
    [" ", "  ", "   "].map(async (indentation) => {
      const html = await render(
        `Before.\n\n${indentation}\`\`\`text source=example lines=2-2\n${indentation}\`\`\``,
        directory
      );

      expect(html).toContain(">  return 1;</span>");
      expect(html).toContain("Before.");
    })
  );
});

test("keeps fence delimiters and MDX-shaped source inert", async () => {
  const { directory } = await fixture(
    "```\n{globalThis.secret()}\n```\nexport const hidden = 1;\n"
  );

  const html = await render(reference, directory);
  expect(html).toContain("globalThis");
  expect(html).not.toContain("hidden");
});

for (const meta of [
  "source=../example lines=2-3",
  "source=example lines=3-2",
  "source=example lines=1-26",
  "source=example lines=2-30",
  "source=example lines=2-3 title=extra",
  "source=example source=example lines=2-3",
  "source=missing lines=2-3",
]) {
  test(`rejects invalid reference ${meta}`, async () => {
    const { directory } = await fixture();
    await expect(
      prepareSourceSnippets(`\`\`\`ts ${meta}\n\`\`\``, directory, "bad.mdx")
    ).rejects.toThrow("bad.mdx:1:");
  });
}

test("rejects body text, nested references and unsupported languages", async () => {
  const { directory } = await fixture();

  await Promise.all(
    [
      "```ts source=example lines=2-3\nconst copied = 1;\n```",
      "> ```ts source=example lines=2-3\n> ```",
      "```unsupported-language source=example lines=2-3\n```",
      "```source=example lines=2-3\n```",
      "```constructor source=example lines=2-3\n```",
    ].map((content) =>
      expect(
        prepareSourceSnippets(content, directory, "bad.mdx")
      ).rejects.toThrow("bad.mdx:1:")
    )
  );
});

test("reports independent failures together before compilation", async () => {
  const { directory } = await fixture();

  const result = prepareSourceSnippets(
    "```ts source=missing lines=1-1\n```\n\n```ts source=example lines=3-2\n```",
    directory,
    "bad.mdx"
  );

  await expect(result).rejects.toThrow("bad.mdx:1:");
  await expect(result).rejects.toThrow("bad.mdx:4:");
});

test("rejects corrupt provenance and symlink snapshots", async () => {
  const { directory, snapshot } = await fixture();
  const file = path.join(directory, "example.json");

  await Promise.all(
    [
      { ...snapshot, content: "changed" },
      { ...snapshot, commit: "main" },
      { ...snapshot, path: "../private.ts" },
      { ...snapshot, repository: ["javascript", "alert(1)"].join(":") },
      { ...snapshot, extra: true },
    ].map(async (invalid) => {
      const isolated = await fixture();
      await writeFile(
        path.join(isolated.directory, "example.json"),
        JSON.stringify(invalid)
      );
      await expect(
        prepareSourceSnippets(reference, isolated.directory, "bad.mdx")
      ).rejects.toThrow("bad.mdx:1:");
    })
  );

  const outside = await fixture();
  await rm(file);
  await symlink(path.join(outside.directory, "example.json"), file);
  await expect(
    prepareSourceSnippets(reference, directory, "bad.mdx")
  ).rejects.toThrow("regular file inside");
});

test("captures the pinned Git blob despite dirty source and refuses to overwrite", async () => {
  const { directory } = await fixture();
  const localRepository = path.join(directory, "repo");
  await mkdir(localRepository);

  const git = (...args: string[]) =>
    execa("git", args, { cwd: localRepository });

  await git("init", "--quiet");
  await git("remote", "add", "origin", repository);
  await writeFile(path.join(localRepository, "example.ts"), source);
  await git("add", "example.ts");
  await git(
    "-c",
    "user.name=Snippet Test",
    "-c",
    "user.email=snippet@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--quiet",
    "-m",
    "fixture"
  );
  const { stdout: pinnedCommit } = await git("rev-parse", "HEAD");
  await writeFile(
    path.join(localRepository, "example.ts"),
    "dirty working tree"
  );

  const input = {
    commit: pinnedCommit,
    id: "captured",
    localRepository,
    repository,
    sourcePath: "example.ts",
  };

  const output = await captureSnippet(input, directory);
  expect(JSON.parse(await readFile(output, "utf-8"))).toEqual({
    blob: sourceBlobHash(source),
    commit: pinnedCommit,
    content: source,
    path: "example.ts",
    repository,
  });
  await expect(captureSnippet(input, directory)).rejects.toThrow("EEXIST");
  await expect(
    captureSnippet(
      { ...input, repository: "https://github.com/wrong/source" },
      directory
    )
  ).rejects.toThrow("does not match origin");
});

test("renders the checked-in class-names example", async () => {
  const directory = path.resolve(import.meta.dir, "../../../content/snippets");

  const html = await render(
    "```ts source=class-names lines=7-7\n```",
    directory
  );

  expect(html).toContain("twMerge");
  expect(html).toContain("clsx");
  expect(html).toContain(
    "0c31d19b5340e35e4dfd4993d06e2cd9fb27ba83/packages/ui/src/lib/utils.ts#L7-L7"
  );
});

test("Content Collections revalidates snapshots even with unchanged post content", async () => {
  const { directory, snapshot } = await fixture();
  const root = path.join(directory, "site");
  const snippetDirectory = path.join(root, "content/snippets");
  await mkdir(snippetDirectory, { recursive: true });
  await mkdir(path.join(root, "content/posts"));
  await mkdir(path.join(root, "public"));
  const snapshotPath = path.join(snippetDirectory, "example.json");
  await writeFile(snapshotPath, JSON.stringify(snapshot));
  await writeFile(
    path.join(root, "content/posts/example.mdx"),
    `---
title: Example
slug: example
summary: A source-backed example.
publishedAt: "2026-11-04"
status: draft
---

${reference}
`
  );

  await mkdir(path.resolve(import.meta.dir, "../../../.content-collections"), {
    recursive: true,
  });

  const buildDirectory = await mkdtemp(
    path.resolve(
      import.meta.dir,
      "../../../.content-collections/test-snippets-"
    )
  );

  temporaryDirectories.push(buildDirectory);
  const config = path.join(buildDirectory, "content-collections.ts");
  await writeFile(
    config,
    `import { createPostsCollection } from ${JSON.stringify(path.join(import.meta.dir, "collection.ts"))};
export default { content: [createPostsCollection(${JSON.stringify(root)}, ${JSON.stringify(path.relative(buildDirectory, path.join(root, "content/posts")))})] };`
  );
  const builder = await createBuilder(config);
  const errors: string[] = [];
  builder.on("_error", (event) => errors.push(event.error.message));
  await builder.build().catch((error) => {
    throw new Error(errors.join("\n"), { cause: error });
  });
  expect(errors).toEqual([]);

  const generated = path.join(
    buildDirectory,
    ".content-collections/generated/allPosts.js"
  );

  expect(await readFile(generated, "utf-8")).toContain(snapshot.commit);
  const changedSource = source.replaceAll("still a comment", "updated comment");

  const updated = {
    ...snapshot,
    blob: sourceBlobHash(changedSource),
    commit: "b".repeat(40),
    content: changedSource,
  };

  await writeFile(snapshotPath, JSON.stringify(updated));
  await builder.build();
  expect(errors).toEqual([]);
  expect(await readFile(generated, "utf-8")).toContain(updated.commit);
  expect(await readFile(generated, "utf-8")).toContain("updated comment");
  await rm(snapshotPath);
  await expect(builder.build()).rejects.toThrow("Invalid blog posts");
  expect(errors.join("\n")).toContain("example.mdx:1:");
});
