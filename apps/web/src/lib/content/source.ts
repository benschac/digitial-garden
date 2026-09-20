import { stat } from "node:fs/promises";
import path from "node:path";
import {
  isPublicationEligible,
  normalizeTagSlug,
  type PostRecord,
  type PostSummary,
} from "./schema";

export interface PublishedPostOptions {
  now?: Date;
}

export function asSummary(post: PostRecord): PostSummary {
  const { mdx: _, sourceFile: __, ...summary } = post;
  return summary;
}

export async function assertLocalImageExists(
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

export function validatePostRegistry(posts: readonly PostRecord[]): void {
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
