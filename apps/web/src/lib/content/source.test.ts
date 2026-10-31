import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createBuilder } from "@content-collections/core";
import { MDXContent } from "@content-collections/mdx/react";
import { Schema } from "effect";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { useMDXComponents } from "../../mdx-components";
import {
  postMetadataParseOptions,
  postMetadataSchema,
  sortPostsNewestFirst,
} from "./schema";
import {
  getBlogPostSummaries,
  getPostSummariesByTag,
  getPublishedPostSummaries,
} from "./source";

const temporaryDirectories: string[] = [];

const parsePostRecords = Schema.decodeUnknownSync(
  Schema.Array(
    Schema.Struct({
      ...postMetadataSchema.fields,
      mdx: Schema.String,
      sourceFile: Schema.String,
    })
  )
);

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  );
});

const createFixture = async () => {
  const root = await mkdtemp(path.join(tmpdir(), "workbench-content-"));
  temporaryDirectories.push(root);
  const contentDirectory = path.join(root, "content", "posts");
  const publicDirectory = path.join(root, "public");
  await mkdir(contentDirectory, { recursive: true });
  await mkdir(publicDirectory, { recursive: true });

  return { contentDirectory, publicDirectory };
};

const loadPostRegistry = async (paths: {
  contentDirectory: string;
  publicDirectory: string;
}) => {
  const root = path.dirname(paths.publicDirectory);
  await mkdir(path.join(process.cwd(), ".content-collections"), {
    recursive: true,
  });

  const buildDirectory = await mkdtemp(
    path.join(process.cwd(), ".content-collections/test-")
  );

  temporaryDirectories.push(buildDirectory);
  const configPath = path.join(buildDirectory, "content-collections.ts");

  const collectionPath = path.join(
    process.cwd(),
    "src/lib/content/collection.ts"
  );

  await writeFile(
    configPath,
    `import { createPostsCollection } from ${JSON.stringify(collectionPath)};
export default { content: [createPostsCollection(${JSON.stringify(root)}, ${JSON.stringify(path.relative(buildDirectory, paths.contentDirectory))})] };`
  );
  const builder = await createBuilder(configPath);
  const errors: string[] = [];
  builder.on("_error", (event) => {
    errors.push(event.error.message);
  });

  try {
    await builder.build();
  } catch (error) {
    if (!errors.length) {
      throw error;
    }
  }

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  const generatedPath = path.join(
    buildDirectory,
    ".content-collections/generated/index.js"
  );

  const { allPosts } = await import(pathToFileURL(generatedPath).href);

  return sortPostsNewestFirst(parsePostRecords(allPosts));
};

const postSource = ({
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
}) =>
  `---
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

describe("post metadata schema", () => {
  const parseMetadata = Schema.decodeUnknownSync(
    postMetadataSchema,
    postMetadataParseOptions
  );

  const validMetadata = {
    publishedAt: "2026-08-20",
    slug: "fixture-post",
    status: "published",
    summary: "A fixture used to validate local content.",
    title: "Fixture post",
  } as const;

  test("normalizes text and supplies fresh metadata defaults", () => {
    const input = {
      ...validMetadata,
      image: " /cover.png ",
      imageAlt: " Cover ",
      order: 0,
      series: " Series ",
      slug: "  fixture-post  ",
      summary: "  Summary  ",
      tags: ["  React Native  "],
      title: "  Fixture post  ",
    };

    expect(parseMetadata(input)).toEqual({
      ...input,
      featured: false,
      image: "/cover.png",
      imageAlt: "Cover",
      series: "Series",
      slug: "fixture-post",
      summary: "Summary",
      tags: ["React Native"],
      title: "Fixture post",
    });
    const first = parseMetadata(validMetadata);

    const second = parseMetadata({
      ...validMetadata,
      featured: undefined,
      tags: undefined,
      updatedAt: undefined,
    });

    expect(first.tags).toEqual([]);
    expect(second.tags).toEqual([]);
    expect(first.tags).not.toBe(second.tags);
    expect(second.featured).toBe(false);
  });

  test("accepts leap days, optional fields, and absolute URL schemes", () => {
    for (const canonicalUrl of [
      "https://example.com/post",
      "mailto:author@example.com",
    ]) {
      expect(
        parseMetadata({
          ...validMetadata,
          canonicalUrl,
          featured: true,
          publishedAt: "2024-02-29",
          updatedAt: "2026-10-17",
        }).canonicalUrl
      ).toBe(canonicalUrl);
    }
  });

  test("trims URLs and removes tabs and newlines without rewriting the URL", () => {
    expect(
      parseMetadata({
        ...validMetadata,
        canonicalUrl: "  HTTPS://EXAMPLE.com/a\tb\n  ",
      }).canonicalUrl
    ).toBe("HTTPS://EXAMPLE.com/ab");
  });

  test.each([
    { title: "   " },
    { summary: "" },
    { slug: "Not a slug" },
    { publishedAt: "2026-02-29" },
    { publishedAt: "2026-04-31" },
    { publishedAt: "2026-8-20" },
    { updatedAt: "2026-13-01" },
    { status: "public" },
    { tags: ["  "] },
    { tags: null },
    { featured: "true" },
    { featured: null },
    { image: " " },
    { imageAlt: " " },
    { series: " " },
    { order: Number.NaN, series: "Series" },
    { order: Number.POSITIVE_INFINITY, series: "Series" },
    { order: "1", series: "Series" },
    { canonicalUrl: "/relative" },
    { canonicalUrl: "not a url" },
  ])("rejects invalid metadata: %j", (invalid) => {
    expect(() => parseMetadata({ ...validMetadata, ...invalid })).toThrow();
  });

  test("rejects unknown metadata keys", () => {
    expect(() => parseMetadata({ ...validMetadata, unexpected: true })).toThrow(
      "no excess property"
    );
  });

  test("reports all cross-field metadata issues", () => {
    const result = Schema.toStandardSchemaV1(postMetadataSchema)[
      "~standard"
    ].validate({
      ...validMetadata,
      image: "https://example.com/post.png",
      order: 1,
    });

    expect(result).not.toBeInstanceOf(Promise);

    if (result instanceof Promise) {
      throw new TypeError("Expected synchronous metadata validation");
    }

    expect(result.issues).toBeDefined();

    if (result.issues) {
      expect(result.issues.map((issue) => issue.path)).toEqual([
        ["imageAlt"],
        ["series"],
      ]);
    }
  });
});

describe("file-based post registry", () => {
  test.each([
    { error: "unexpected", fields: "unexpected: true" },
    { error: "valid ISO date", fields: 'updatedAt: "2026-02-29"' },
    { error: "imageAlt is required", fields: 'image: "/cover.png"\norder: 1' },
    { error: "series is required", fields: 'image: "/cover.png"\norder: 1' },
  ])(
    "rejects invalid frontmatter through the collection: %j",
    async ({ fields, error }) => {
      const paths = await createFixture();
      await writeFile(
        path.join(paths.contentDirectory, "invalid.md"),
        postSource({ slug: "invalid" }).replace("\n---\n", `\n${fields}\n---\n`)
      );
      await expect(loadPostRegistry(paths)).rejects.toThrow(error);
    }
  );

  test("validates the repository posts", async () => {
    const posts = await loadPostRegistry({
      contentDirectory: path.join(process.cwd(), "content", "posts"),
      publicDirectory: path.join(process.cwd(), "public"),
    });

    expect(posts.map((post) => post.slug)).toEqual([
      "marketplace-policies-with-a-decider",
      "creating-double-sided-accounting",
      "coordinating-identification-with-effect",
      "build-snap-to-post",
      "how-we-use-effect-in-snap-to-post",
      "rust-wasm-webgpu-particles",
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

    const draft = posts.find(
      (post) => post.slug === "how-we-use-effect-in-snap-to-post"
    );

    const ledgerSlug = "creating-double-sided-accounting";
    expect(posts.find((post) => post.slug === ledgerSlug)?.status).toBe(
      "draft"
    );
    expect(
      getBlogPostSummaries(posts, "development").map((post) => post.slug)
    ).toContain(ledgerSlug);
    expect(
      getBlogPostSummaries(posts, "production").map((post) => post.slug)
    ).not.toContain(ledgerSlug);
    expect(
      getPublishedPostSummaries(posts).map((post) => post.slug)
    ).not.toContain(ledgerSlug);
    expect(draft?.status).toBe("draft");
    expect(
      getPublishedPostSummaries(posts).map((post) => post.slug)
    ).not.toContain(draft?.slug);
  });

  test("renders compiled MDX with the existing plugins and components", async () => {
    const paths = await createFixture();
    await writeFile(
      path.join(paths.contentDirectory, "rendering.mdx"),
      `${postSource({ slug: "rendering" })}

<Callout title="Tip">A useful note.</Callout>

<EffectWalkthrough kind="factory" />

1. **A future post** <ComingSoon />

| Name | Value |
| --- | --- |
| Example | 42 |

$E = mc^2$

\`\`\`ts
const answer = 42;
\`\`\`

![Example](https://example.com/image.png "Caption")
`
    );
    const posts = await loadPostRegistry(paths);
    const [post] = posts;

    if (!post) {
      throw new Error("Expected a compiled fixture post");
    }

    const html = renderToStaticMarkup(
      createElement(MDXContent, {
        code: post.mdx,
        components: useMDXComponents(),
      })
    );

    expect(html).toContain('id="body"');
    expect(html).toContain("data-mdx-callout");
    expect(html).toContain('data-effect-walkthrough="factory"');
    expect(html).toContain("Describe first. Run when admitted.");
    expect(html).toContain("The async factory has not been called");
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain("Coming soon");
    expect(html).toContain("<table>");
    expect(html).toContain('data-column-label="Name"');
    expect(html).toContain('data-column-label="Value"');
    expect(html).toContain("katex");
    expect(html).toContain("shiki");
    expect(html).toContain("<figcaption>Caption</figcaption>");
    expect(html).not.toContain("<p><figure");
    expect(getPublishedPostSummaries(posts)[0]).not.toHaveProperty("mdx");
  });

  test("sorts deterministically and excludes private or future posts", async () => {
    const paths = await createFixture();
    await Promise.all([
      writeFile(
        path.join(paths.contentDirectory, "older.md"),
        postSource({ publishedAt: "2026-08-19", slug: "older" })
      ),
      writeFile(
        path.join(paths.contentDirectory, "newer.md"),
        postSource({ publishedAt: "2026-08-20", slug: "newer" })
      ),
      writeFile(
        path.join(paths.contentDirectory, "draft.md"),
        postSource({ slug: "draft", status: "draft" })
      ),
      writeFile(
        path.join(paths.contentDirectory, "archived.md"),
        postSource({ slug: "archived", status: "archived" })
      ),
      writeFile(
        path.join(paths.contentDirectory, "future.md"),
        postSource({ publishedAt: "2026-09-01", slug: "future" })
      ),
    ]);

    const posts = await loadPostRegistry(paths);

    const published = getPublishedPostSummaries(posts, {
      now: new Date("2026-08-23T12:00:00.000Z"),
    });

    expect(published.map((post) => post.slug)).toEqual(["newer", "older"]);
    const options = { now: new Date("2026-08-23T12:00:00.000Z") };
    expect(
      getBlogPostSummaries(posts, "development", options).map(
        (post) => post.slug
      )
    ).toEqual(["draft", "newer", "older"]);

    for (const environment of ["production", "test", "preview", undefined]) {
      expect(getBlogPostSummaries(posts, environment, options)).toEqual(
        published
      );
    }
  });

  test("rejects duplicate slugs", async () => {
    const paths = await createFixture();
    await Promise.all([
      writeFile(
        path.join(paths.contentDirectory, "first.md"),
        postSource({ slug: "same-slug" })
      ),
      writeFile(
        path.join(paths.contentDirectory, "second.mdx"),
        postSource({ slug: "same-slug" })
      ),
    ]);

    await expect(loadPostRegistry(paths)).rejects.toThrow(
      "Duplicate post slug"
    );
  });

  test("rejects missing local images", async () => {
    const paths = await createFixture();

    const source = postSource({ slug: "missing-image" }).replace(
      'tags:\n  - "Systems"',
      'tags:\n  - "Systems"\nimage: "/images/posts/missing.png"\nimageAlt: "Missing"'
    );

    await writeFile(
      path.join(paths.contentDirectory, "missing-image.md"),
      source
    );

    await expect(loadPostRegistry(paths)).rejects.toThrow("does not exist");
  });

  test("rejects missing required metadata", async () => {
    const paths = await createFixture();

    const source = postSource({ slug: "missing-title" }).replace(
      'title: "Fixture post"\n',
      ""
    );

    await writeFile(
      path.join(paths.contentDirectory, "missing-title.md"),
      source
    );

    await expect(loadPostRegistry(paths)).rejects.toThrow("title");
  });

  test("rejects arbitrary MDX imports", async () => {
    const paths = await createFixture();
    await writeFile(
      path.join(paths.contentDirectory, "unsafe.mdx"),
      `${postSource({ slug: "unsafe" })}\nimport Widget from "./widget"\n\n<Widget />`
    );

    await expect(loadPostRegistry(paths)).rejects.toThrow(
      "imports, exports, and arbitrary JavaScript expressions are disabled"
    );
  });

  test("rejects non-allowlisted MDX components", async () => {
    const paths = await createFixture();
    await writeFile(
      path.join(paths.contentDirectory, "unsafe-component.mdx"),
      `${postSource({ slug: "unsafe-component" })}\n<UntrustedWidget />`
    );

    await expect(loadPostRegistry(paths)).rejects.toThrow(
      'MDX component "UntrustedWidget" is not allowlisted'
    );
  });

  test("normalizes tags for lookup without changing display labels", async () => {
    const paths = await createFixture();
    await writeFile(
      path.join(paths.contentDirectory, "tagged.md"),
      postSource({ slug: "tagged", tags: ["React Native"] })
    );

    const posts = await loadPostRegistry(paths);

    const matches = getPostSummariesByTag(posts, "react-native", {
      now: new Date("2026-08-23T12:00:00.000Z"),
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]?.tags).toEqual(["React Native"]);
  });
});
