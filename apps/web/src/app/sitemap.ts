import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/content";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const posts = await getPublishedPosts();

  return [
    { url: new URL("/", siteUrl).toString() },
    { url: new URL("/blog", siteUrl).toString() },
    ...posts.map((post) => ({
      url: new URL(`/blog/${post.slug}`, siteUrl).toString(),
      lastModified: post.updatedAt ?? post.publishedAt,
    })),
  ];
}
