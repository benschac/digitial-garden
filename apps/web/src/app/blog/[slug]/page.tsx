import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { ParticleHeaderBackground } from "@/app/experiments/wasm-canvas/particle-header-background";
import {
  getAdjacentPosts,
  getAllPostSlugs,
  getPostBySlug,
} from "@/lib/content";
import { ArticleSurface } from "../article-surface";
import styles from "../blog.module.css";
import { BlogTransition } from "../blog-transition";
import { ColorfulSVGPattern } from "../colorful-svg-pattern";
import patternStyles from "../colorful-svg-pattern.module.css";

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
  const hasParticleHeader = post.slug === "rust-wasm-webgpu-particles";
  const hasSvgHeader = post.slug === "animated-blog-post-background";

  return (
    <BlogTransition key={slug} name="blog-post-page" view="article">
      <main className={styles.page}>
        <ArticleSurface slug={post.slug} className={styles.surface} expanded />
        <article>
          <header
            className={`${styles.postHeader}${
              hasParticleHeader ? ` ${styles.particlePostHeader}` : ""
            }${hasSvgHeader ? ` ${patternStyles.header}` : ""}`}
          >
            {hasSvgHeader ? <ColorfulSVGPattern /> : null}
            <Link
              aria-label="All posts"
              className={styles.backLink}
              href="/blog"
              transitionTypes={["blog-close"]}
            >
              <span aria-hidden="true">←</span>
            </Link>
            <ViewTransition
              name={`post-title-${post.slug}`}
              default="none"
              share="blog-title"
            >
              <h1>{post.title}</h1>
            </ViewTransition>
            <p className={styles.summary}>{post.summary}</p>
            <p className={styles.metadata}>
              Published{" "}
              <time dateTime={post.publishedAt}>{post.publishedAt}</time>
              {post.updatedAt ? (
                <>
                  {" · Updated "}
                  <time dateTime={post.updatedAt}>{post.updatedAt}</time>
                </>
              ) : null}
            </p>
            {hasParticleHeader ? (
              <ParticleHeaderBackground
                canvasClassName={styles.particleHeaderCanvas}
                controlsClassName={styles.particleHeaderControls}
              />
            ) : null}
          </header>
          <div className={styles.prose}>
            <Content />
          </div>
        </article>
        <nav aria-label="Adjacent posts" className={styles.postNavigation}>
          <div>
            {adjacentPosts.previous ? (
              <Link
                href={`/blog/${adjacentPosts.previous.slug}`}
                transitionTypes={["nav-back"]}
              >
                <span>Previous</span>
                {adjacentPosts.previous.title}
              </Link>
            ) : null}
          </div>
          <div>
            {adjacentPosts.next ? (
              <Link
                href={`/blog/${adjacentPosts.next.slug}`}
                transitionTypes={["nav-forward"]}
              >
                <span>Next</span>
                {adjacentPosts.next.title}
              </Link>
            ) : null}
          </div>
        </nav>
      </main>
    </BlogTransition>
  );
}
