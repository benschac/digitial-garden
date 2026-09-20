import { readdir } from "node:fs/promises";
import path from "node:path";
import { defineCollection } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import rehypeShiki from "@shikijs/rehype";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { z } from "zod";
import { postMetadataSchema } from "./schema";
import { assertLocalImageExists, validatePostRegistry } from "./source";
import { validateTrustedMdx } from "./validate-mdx";

export function createPostsCollection(
  rootDirectory: string,
  directory = "content/posts",
) {
  const contentDirectory = path.join(rootDirectory, "content/posts");
  return defineCollection({
    name: "posts",
    directory,
    include: "*.{md,mdx}",
    schema: postMetadataSchema.safeExtend({ content: z.string() }),
    transform: async (document, context) => {
      const { content, _meta, ...metadata } = document;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.(md|mdx)$/.test(_meta.fileName)) {
        throw new Error(`Invalid post filename: ${_meta.fileName}`);
      }
      await validateTrustedMdx(content, _meta.fileName);
      await assertLocalImageExists(
        metadata.image,
        _meta.fileName,
        path.join(rootDirectory, "public"),
      );
      const mdx = await compileMDX(context, document, {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [
          rehypeSlug,
          rehypeKatex,
          [rehypeShiki, { theme: "github-dark-dimmed" }],
        ],
      });
      return { ...metadata, sourceFile: _meta.fileName, mdx };
    },
    onSuccess: async (posts) => {
      // The Next adapter can otherwise continue after individual file errors.
      const files = (await readdir(contentDirectory, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && /\.(md|mdx)$/.test(entry.name))
        .map((entry) => entry.name);
      const compiled = new Set(posts.map((post) => post.sourceFile));
      const missing = files.filter((file) => !compiled.has(file));
      if (missing.length) {
        throw new Error(
          `Invalid blog posts: ${missing.join(", ")}. See content errors above.`,
        );
      }
      validatePostRegistry(posts);
    },
  });
}
