import { readdir } from "node:fs/promises";
import path from "node:path";

import { defineCollection } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import rehypeShiki from "@shikijs/rehype";
import { Schema } from "effect";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { postDocumentSchema, postMetadataParseOptions } from "./schema";
import { assertLocalImageExists, validatePostRegistry } from "./source";
import { validateTrustedMdx } from "./validate-mdx";

export const createPostsCollection = (
  rootDirectory: string,
  directory = "content/posts"
) => {
  const contentDirectory = path.join(rootDirectory, "content/posts");

  return defineCollection({
    directory,
    include: "*.{md,mdx}",
    name: "posts",
    schema: Schema.toStandardSchemaV1(postDocumentSchema, {
      parseOptions: postMetadataParseOptions,
    }),
    transform: async (document, context) => {
      const { content, _meta, ...metadata } = document;

      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:md|mdx)$/u.test(_meta.fileName)) {
        throw new Error(`Invalid post filename: ${_meta.fileName}`);
      }

      await validateTrustedMdx(content, _meta.fileName);
      await assertLocalImageExists(
        metadata.image,
        _meta.fileName,
        path.join(rootDirectory, "public")
      );

      const mdx = await compileMDX(context, document, {
        rehypePlugins: [
          rehypeSlug,
          rehypeKatex,
          [rehypeShiki, { theme: "github-dark-dimmed" }],
        ],
        remarkPlugins: [remarkGfm, remarkMath],
      });

      return { ...metadata, mdx, sourceFile: _meta.fileName };
    },
    onSuccess: async (posts) => {
      // The Next adapter can otherwise continue after individual file errors.
      const entries = await readdir(contentDirectory, { withFileTypes: true });

      const files = entries
        .filter((entry) => entry.isFile() && /\.(?:md|mdx)$/u.test(entry.name))
        .map((entry) => entry.name);

      const compiled = new Set(posts.map((post) => post.sourceFile));
      const missing = files.filter((file) => !compiled.has(file));

      if (missing.length) {
        throw new Error(
          `Invalid blog posts: ${missing.join(", ")}. See content errors above.`
        );
      }

      validatePostRegistry(posts);
    },
  });
};
