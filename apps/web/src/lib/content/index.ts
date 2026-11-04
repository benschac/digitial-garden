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

export const getAllPosts = async (): Promise<PostSummary[]> =>
  getRegistry().map(asSummary);

export const getPublishedPosts = async (): Promise<PostSummary[]> =>
  getPublishedPostSummaries(getRegistry());

export const getBlogPosts = async (): Promise<PostSummary[]> =>
  getBlogPostSummaries(getRegistry(), process.env.NODE_ENV);

export const getPostBySlug = async (
  slug: string
): Promise<
  | (PostSummary & {
      Content: ComponentType<Record<string, never>>;
    })
  | undefined
> => {
  const posts = getRegistry();
  const post = posts.find((candidate) => candidate.slug === slug);

  let result:
    | (PostSummary & { Content: ComponentType<Record<string, never>> })
    | undefined;

  if (post && getBlogPostSummaries([post], process.env.NODE_ENV).length > 0) {
    const code = post.mdx;

    const Content = () =>
      createElement(MDXContent, {
        code,
        components: useMDXComponents(),
      });

    result = { ...asSummary(post), Content };
  }

  return result;
};

export const getPostsByTag = async (tag: string): Promise<PostSummary[]> =>
  getPostSummariesByTag(getRegistry(), tag);

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
