import type { MetadataRoute } from "next";

import { getPublishedPosts } from "@/lib/content";
import { getSiteUrl } from "@/lib/site";

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const siteUrl = getSiteUrl();
  const posts = await getPublishedPosts();

  return [
    { url: new URL("/", siteUrl).toString() },
    { url: new URL("/blog", siteUrl).toString() },
    ...(process.env.NODE_ENV === "development"
      ? [{ url: new URL("/about", siteUrl).toString() }]
      : []),
    ...posts.map((post) => ({
      lastModified: post.updatedAt ?? post.publishedAt,
      url: new URL(`/blog/${post.slug}`, siteUrl).toString(),
    })),
  ];
};

export default sitemap;
