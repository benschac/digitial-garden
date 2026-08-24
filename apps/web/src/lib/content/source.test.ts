import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { postMetadataSchema } from "./schema";
import {
  getPostSummariesByTag,
  getPublishedPostSummaries,
  loadPostRegistry,
} from "./source";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function createFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "workbench-content-"));
  temporaryDirectories.push(root);
  const contentDirectory = path.join(root, "content", "posts");
  const publicDirectory = path.join(root, "public");
  await mkdir(contentDirectory, { recursive: true });
  await mkdir(publicDirectory, { recursive: true });
  return { contentDirectory, publicDirectory };
}

function postSource({
  publishedAt = "2026-08-20",
  slug,
  status = "published",
  tags = ["Systems"],
  title = "Fixture post",
}: {
  publishedAt?: string;
  slug: string;
  status?: "archived" | "draft" | "published";
  tags?: string[];
  title?: string;
}) {
  return `---
title: "${title}"
slug: "${slug}"
summary: "A fixture used to validate local content."
publishedAt: "${publishedAt}"
status: "${status}"
tags:
${tags.map((tag) => `  - "${tag}"`).join("\n")}
---

## Body

Fixture content.
`;
}

describe("post metadata schema", () => {
  const validMetadata = {
    publishedAt: "2026-08-20",
    slug: "fixture-post",
    status: "published",
    summary: "A fixture used to validate local content.",
    title: "Fixture post",
  } as const;

  test("rejects unknown metadata keys", () => {
    expect(() =>
      postMetadataSchema.parse({ ...validMetadata, unexpected: true }),
    ).toThrow("Unrecognized key");
  });

  test("reports all cross-field metadata issues", () => {
    const result = postMetadataSchema.safeParse({
      ...validMetadata,
      image: "https://example.com/post.png",
      order: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual([
        ["imageAlt"],
        ["series"],
      ]);
    }
  });
});

describe("file-based post registry", () => {
  test("validates the repository posts", async () => {
    const posts = await loadPostRegistry({
      contentDirectory: path.join(process.cwd(), "content", "posts"),
      publicDirectory: path.join(process.cwd(), "public"),
    });

    expect(posts.map((post) => post.slug)).toEqual([
      "designing-a-bezier-system-map",
      "rust-wasm-webgpu-particles",
      "why-i-built-this",
      "upload-to-pinata-ipfs",
      "persist-react-navigation-router-state",
      "animated-blog-post-background",
      "how-to-configure-and-package-fonts-with-tamagui",
      "fixing-react-native-universal-fs-node-module",
      "return-statement",
      "what-i-learned-fixing-one-line-of-css-in-svelte",
      "what-i-learned-from-failure",
      "what-i-learned-9-months-into-my-first-programming-job",
      "self-positioning-react-components",
      "how-i-got-my-first-developer-job",
    ]);
  });

  test("sorts deterministically and excludes private or future posts", async () => {
    const paths = await createFixture();
    await Promise.all([
      writeFile(
        path.join(paths.contentDirectory, "older.md"),
        postSource({ publishedAt: "2026-08-19", slug: "older" }),
      ),
      writeFile(
        path.join(paths.contentDirectory, "newer.md"),
        postSource({ publishedAt: "2026-08-20", slug: "newer" }),
      ),
      writeFile(
        path.join(paths.contentDirectory, "draft.md"),
        postSource({ slug: "draft", status: "draft" }),
      ),
      writeFile(
        path.join(paths.contentDirectory, "archived.md"),
        postSource({ slug: "archived", status: "archived" }),
      ),
      writeFile(
        path.join(paths.contentDirectory, "future.md"),
        postSource({ publishedAt: "2026-09-01", slug: "future" }),
      ),
    ]);

    const posts = await loadPostRegistry(paths);
    const published = getPublishedPostSummaries(posts, {
      now: new Date("2026-08-23T12:00:00.000Z"),
    });

    expect(published.map((post) => post.slug)).toEqual(["newer", "older"]);
  });

  test("rejects duplicate slugs", async () => {
    const paths = await createFixture();
    await Promise.all([
      writeFile(
        path.join(paths.contentDirectory, "first.md"),
        postSource({ slug: "same-slug" }),
      ),
      writeFile(
        path.join(paths.contentDirectory, "second.mdx"),
        postSource({ slug: "same-slug" }),
      ),
    ]);

    await expect(loadPostRegistry(paths)).rejects.toThrow(
      "Duplicate post slug",
    );
  });

  test("rejects missing local images", async () => {
    const paths = await createFixture();
    const source = postSource({ slug: "missing-image" }).replace(
      'tags:\n  - "Systems"',
      'tags:\n  - "Systems"\nimage: "/images/posts/missing.png"\nimageAlt: "Missing"',
    );
    await writeFile(
      path.join(paths.contentDirectory, "missing-image.md"),
      source,
    );

    await expect(loadPostRegistry(paths)).rejects.toThrow("does not exist");
  });

  test("rejects missing required metadata", async () => {
    const paths = await createFixture();
    const source = postSource({ slug: "missing-title" }).replace(
      'title: "Fixture post"\n',
      "",
    );
    await writeFile(
      path.join(paths.contentDirectory, "missing-title.md"),
      source,
    );

    await expect(loadPostRegistry(paths)).rejects.toThrow(
      "Invalid post metadata",
    );
  });

  test("rejects arbitrary MDX imports", async () => {
    const paths = await createFixture();
    await writeFile(
      path.join(paths.contentDirectory, "unsafe.mdx"),
      `${postSource({ slug: "unsafe" })}\nimport Widget from "./widget"\n\n<Widget />`,
    );

    await expect(loadPostRegistry(paths)).rejects.toThrow(
      "imports, exports, and arbitrary JavaScript expressions are disabled",
    );
  });

  test("rejects non-allowlisted MDX components", async () => {
    const paths = await createFixture();
    await writeFile(
      path.join(paths.contentDirectory, "unsafe-component.mdx"),
      `${postSource({ slug: "unsafe-component" })}\n<UntrustedWidget />`,
    );

    await expect(loadPostRegistry(paths)).rejects.toThrow(
      'MDX component "UntrustedWidget" is not allowlisted',
    );
  });

  test("normalizes tags for lookup without changing display labels", async () => {
    const paths = await createFixture();
    await writeFile(
      path.join(paths.contentDirectory, "tagged.md"),
      postSource({ slug: "tagged", tags: ["React Native"] }),
    );

    const posts = await loadPostRegistry(paths);
    const matches = getPostSummariesByTag(posts, "react-native", {
      now: new Date("2026-08-23T12:00:00.000Z"),
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]?.tags).toEqual(["React Native"]);
  });
});
