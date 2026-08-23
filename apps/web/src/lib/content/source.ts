import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  isPublicationEligible,
  normalizeTagSlug,
  type PostRecord,
  type PostSummary,
  postMetadataSchema,
  sortPostsNewestFirst,
} from "./schema";
import { validateTrustedMdx } from "./validate-mdx";

const postFilePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(md|mdx)$/;

export interface ContentPaths {
  contentDirectory: string;
  publicDirectory: string;
}

export interface PublishedPostOptions {
  now?: Date;
}

function asSummary(post: PostRecord): PostSummary {
  const { extension: _, sourceFile: __, sourceStem: ___, ...summary } = post;
  return summary;
}

function formatValidationError(fileName: string, error: unknown): Error {
  if (error instanceof Error) {
    return new Error(`Invalid post metadata in ${fileName}: ${error.message}`, {
      cause: error,
    });
  }

  return new Error(`Invalid post metadata in ${fileName}`);
}

async function assertLocalImageExists(
  image: string | undefined,
  fileName: string,
  publicDirectory: string,
): Promise<void> {
  if (!image || /^https?:\/\//.test(image)) {
    return;
  }

  if (!image.startsWith("/")) {
    throw new Error(
      `Invalid post metadata in ${fileName}: local image paths must start with /`,
    );
  }

  const resolvedPublicDirectory = path.resolve(publicDirectory);
  const resolvedImage = path.resolve(resolvedPublicDirectory, image.slice(1));

  if (!resolvedImage.startsWith(`${resolvedPublicDirectory}${path.sep}`)) {
    throw new Error(
      `Invalid post metadata in ${fileName}: image path escapes the public directory`,
    );
  }

  try {
    const imageStat = await stat(resolvedImage);
    if (!imageStat.isFile()) {
      throw new Error("not a file");
    }
  } catch (error) {
    throw new Error(
      `Invalid post metadata in ${fileName}: local image ${image} does not exist`,
      { cause: error },
    );
  }
}

export async function loadPostRegistry({
  contentDirectory,
  publicDirectory,
}: ContentPaths): Promise<PostRecord[]> {
  const entries = await readdir(contentDirectory, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile() && postFilePattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  const posts = await Promise.all(
    fileNames.map(async (fileName): Promise<PostRecord> => {
      const rawPost = await readFile(
        path.join(contentDirectory, fileName),
        "utf8",
      );
      const parsed = matter(rawPost);

      await validateTrustedMdx(parsed.content, fileName);

      const metadataResult = postMetadataSchema.safeParse(parsed.data);
      if (!metadataResult.success) {
        throw formatValidationError(fileName, metadataResult.error);
      }
      const metadata = metadataResult.data;

      await assertLocalImageExists(metadata.image, fileName, publicDirectory);

      const extension = path.extname(fileName) as ".md" | ".mdx";
      return {
        ...metadata,
        extension,
        sourceFile: fileName,
        sourceStem: fileName.slice(0, -extension.length),
      };
    }),
  );

  const slugOwners = new Map<string, string>();
  for (const post of posts) {
    const existingOwner = slugOwners.get(post.slug);
    if (existingOwner) {
      throw new Error(
        `Duplicate post slug "${post.slug}" in ${existingOwner} and ${post.sourceFile}`,
      );
    }
    slugOwners.set(post.slug, post.sourceFile);

    const tagSlugs = new Set<string>();
    for (const tag of post.tags) {
      const tagSlug = normalizeTagSlug(tag);
      if (!tagSlug) {
        throw new Error(
          `Invalid post metadata in ${post.sourceFile}: tag "${tag}" has no URL-safe characters`,
        );
      }
      if (tagSlugs.has(tagSlug)) {
        throw new Error(
          `Invalid post metadata in ${post.sourceFile}: duplicate normalized tag "${tagSlug}"`,
        );
      }
      tagSlugs.add(tagSlug);
    }
  }

  return sortPostsNewestFirst(posts);
}

export function getPublishedPostSummaries(
  posts: readonly PostRecord[],
  { now = new Date() }: PublishedPostOptions = {},
): PostSummary[] {
  return posts
    .filter((post) => isPublicationEligible(post, now))
    .map(asSummary);
}

export function getPostSummariesByTag(
  posts: readonly PostRecord[],
  tag: string,
  options?: PublishedPostOptions,
): PostSummary[] {
  const requestedTag = normalizeTagSlug(tag);
  return getPublishedPostSummaries(posts, options).filter((post) =>
    post.tags.some((postTag) => normalizeTagSlug(postTag) === requestedTag),
  );
}
