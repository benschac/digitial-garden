import "server-only";

import path from "node:path";
import type { ComponentType } from "react";
import type { PostRecord, PostSummary } from "./schema";
import {
  getPostSummariesByTag,
  getPublishedPostSummaries,
  loadPostRegistry,
} from "./source";

const contentDirectory = path.join(process.cwd(), "content", "posts");
const publicDirectory = path.join(process.cwd(), "public");

let registryPromise: Promise<PostRecord[]> | undefined;

function getRegistry(): Promise<PostRecord[]> {
  registryPromise ??= loadPostRegistry({ contentDirectory, publicDirectory });
  return registryPromise;
}

async function loadPostComponent(
  post: PostRecord,
): Promise<ComponentType<Record<string, never>>> {
  if (post.extension === ".md") {
    const module = await import(`../../../content/posts/${post.sourceStem}.md`);
    return module.default;
  }

  const module = await import(`../../../content/posts/${post.sourceStem}.mdx`);
  return module.default;
}

export async function getAllPosts(): Promise<PostSummary[]> {
  const posts = await getRegistry();
  return posts.map(
    ({ extension: _, sourceFile: __, sourceStem: ___, ...summary }) => summary,
  );
}

export async function getPublishedPosts(): Promise<PostSummary[]> {
  return getPublishedPostSummaries(await getRegistry());
}

export async function getPostBySlug(slug: string): Promise<
  | (PostSummary & {
      Content: ComponentType<Record<string, never>>;
    })
  | undefined
> {
  const posts = await getRegistry();
  const post = posts.find((candidate) => candidate.slug === slug);

  if (!post || !getPublishedPostSummaries([post]).length) {
    return undefined;
  }

  const { extension: _, sourceFile: __, sourceStem: ___, ...summary } = post;
  return { ...summary, Content: await loadPostComponent(post) };
}

export async function getPostsByTag(tag: string): Promise<PostSummary[]> {
  return getPostSummariesByTag(await getRegistry(), tag);
}

export async function getAllPostSlugs(): Promise<string[]> {
  return (await getPublishedPosts()).map((post) => post.slug);
}

export async function getAdjacentPosts(slug: string): Promise<{
  next?: PostSummary;
  previous?: PostSummary;
}> {
  const posts = await getPublishedPosts();
  const currentIndex = posts.findIndex((post) => post.slug === slug);

  if (currentIndex === -1) {
    return {};
  }

  return {
    next: posts[currentIndex - 1],
    previous: posts[currentIndex + 1],
  };
}

export type { PostMetadata, PostSummary } from "./schema";
