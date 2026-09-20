import "server-only";

import { MDXContent } from "@content-collections/mdx/react";
import { allPosts } from "content-collections";
import { type ComponentType, createElement } from "react";
import { useMDXComponents } from "@/mdx-components";
import { type PostSummary, sortPostsNewestFirst } from "./schema";
import {
  asSummary,
  getPostSummariesByTag,
  getPublishedPostSummaries,
} from "./source";

function getRegistry() {
  return sortPostsNewestFirst(allPosts);
}

export async function getAllPosts(): Promise<PostSummary[]> {
  const posts = getRegistry();
  return posts.map(asSummary);
}

export async function getPublishedPosts(): Promise<PostSummary[]> {
  return getPublishedPostSummaries(getRegistry());
}

export async function getPostBySlug(slug: string): Promise<
  | (PostSummary & {
      Content: ComponentType<Record<string, never>>;
    })
  | undefined
> {
  const posts = getRegistry();
  const post = posts.find((candidate) => candidate.slug === slug);

  if (!post || !getPublishedPostSummaries([post]).length) {
    return undefined;
  }

  const code = post.mdx;
  function Content() {
    return createElement(MDXContent, {
      code,
      components: useMDXComponents(),
    });
  }

  return { ...asSummary(post), Content };
}

export async function getPostsByTag(tag: string): Promise<PostSummary[]> {
  return getPostSummariesByTag(getRegistry(), tag);
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
