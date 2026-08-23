import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdjacentPosts,
  getAllPostSlugs,
  getPostBySlug,
} from "@/lib/content";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getAllPostSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const canonical = post.canonicalUrl ?? `/blog/${post.slug}`;
  const images = post.image
    ? [{ alt: post.imageAlt ?? post.title, url: post.image }]
    : undefined;

  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      tags: post.tags,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: post.title,
      description: post.summary,
      images: images?.map((image) => image.url),
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const [post, adjacentPosts] = await Promise.all([
    getPostBySlug(slug),
    getAdjacentPosts(slug),
  ]);

  if (!post) {
    notFound();
  }

  const { Content } = post;

  return (
    <main>
      <article>
        <header>
          <Link href="/blog">← All posts</Link>
          <h1>{post.title}</h1>
          <p>{post.summary}</p>
          <p>
            Published{" "}
            <time dateTime={post.publishedAt}>{post.publishedAt}</time>
            {post.updatedAt ? (
              <>
                {" · Updated "}
                <time dateTime={post.updatedAt}>{post.updatedAt}</time>
              </>
            ) : null}
          </p>
        </header>
        <div>
          <Content />
        </div>
      </article>
      <nav aria-label="Adjacent posts">
        <div>
          {adjacentPosts.previous ? (
            <Link href={`/blog/${adjacentPosts.previous.slug}`}>
              <span>Previous</span>
              {adjacentPosts.previous.title}
            </Link>
          ) : null}
        </div>
        <div>
          {adjacentPosts.next ? (
            <Link href={`/blog/${adjacentPosts.next.slug}`}>
              <span>Next</span>
              {adjacentPosts.next.title}
            </Link>
          ) : null}
        </div>
      </nav>
    </main>
  );
}
