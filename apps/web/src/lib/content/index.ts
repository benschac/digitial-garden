import "server-only";
import { MDXContent } from "@content-collections/mdx/react";
import { allPosts } from "content-collections";
import { createElement } from "react";
import type { ComponentType } from "react";

import { useMDXComponents } from "@/mdx-components";

import { sortPostsNewestFirst } from "./schema";
import type { PostSummary } from "./schema";
import {
  asSummary,
  getBlogPostSummaries,
  getPostSummariesByTag,
  getPublishedPostSummaries,
} from "./source";

const getRegistry = () => sortPostsNewestFirst(allPosts);

export const getAllPosts = (): Promise<PostSummary[]> =>
  Promise.try(() => getRegistry().map(asSummary));

export const getPublishedPosts = (): Promise<PostSummary[]> =>
  Promise.try(() => getPublishedPostSummaries(getRegistry()));

export const getBlogPosts = (): Promise<PostSummary[]> =>
  Promise.try(() => getBlogPostSummaries(getRegistry(), process.env.NODE_ENV));

export const getPostBySlug = (
  slug: string
): Promise<
  | (PostSummary & {
      Content: ComponentType<Record<string, never>>;
    })
  | undefined
> =>
  Promise.try(() => {
    const posts = getRegistry();
    const post = posts.find((candidate) => candidate.slug === slug);

    if (!post || !getBlogPostSummaries([post], process.env.NODE_ENV).length) {
      return;
    }

    const code = post.mdx;

    const Content = () =>
      createElement(MDXContent, {
        code,
        components: useMDXComponents(),
      });

    return { ...asSummary(post), Content };
  });

export const getPostsByTag = (tag: string): Promise<PostSummary[]> =>
  Promise.try(() => getPostSummariesByTag(getRegistry(), tag));

export const getAllPostSlugs = async (): Promise<string[]> => {
  const posts = await getBlogPosts();

  return posts.map((post) => post.slug);
};

export const getAdjacentPosts = async (
  slug: string
): Promise<{
  next?: PostSummary;
  previous?: PostSummary;
}> => {
  const posts = await getBlogPosts();
  const currentIndex = posts.findIndex((post) => post.slug === slug);

  if (currentIndex === -1) {
    return {};
  }

  return {
    next: posts[currentIndex - 1],
    previous: posts[currentIndex + 1],
  };
};

export type { PostMetadata, PostSummary } from "./schema";
