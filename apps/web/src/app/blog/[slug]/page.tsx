import { cn } from "@personal-site/ui/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { ParticleHeaderBackground } from "@/app/experiments/wasm-canvas/particle-header-background";
import { Typography, typographyVariants } from "@/components/page-typography";
import {
  getAdjacentPosts,
  getAllPostSlugs,
  getPostBySlug,
} from "@/lib/content";
import { ArticleSurface } from "../article-surface";
import { BlogTransition } from "../blog-transition";
import { ColorfulSVGPattern } from "../colorful-svg-pattern";
import { PaperValley } from "../paper-valley";
import paperStyles from "../paper-valley.module.css";
import styles from "./article-styles";

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
    robots:
      post.status === "draft" ? { index: false, follow: false } : undefined,
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
  const hasLandscapeHeader = post.slug === "build-snap-to-post";
  const titleSeparator = hasLandscapeHeader ? post.title.indexOf(": ") : -1;

  return (
    <BlogTransition key={slug} name="blog-post-page" view="article">
      <Typography as="main" variant="ui" className={styles.page}>
        <ArticleSurface slug={post.slug} className={styles.surface} expanded />
        {!hasLandscapeHeader && (
          <nav
            aria-label="Blog navigation"
            className={cn(
              styles.backNavigation,
              hasParticleHeader && styles.particleBackNavigation,
            )}
          >
            <Link
              className={typographyVariants({
                variant: "articleBackLink",
                className: `${styles.link} ${styles.backLink}`,
              })}
              href="/blog"
              transitionTypes={["blog-close"]}
            >
              <span aria-hidden="true">←</span>
              <span>All posts</span>
            </Link>
          </nav>
        )}
        <article className={styles.article}>
          {hasLandscapeHeader ? (
            <PaperValley>
              <nav className={paperStyles.back} aria-label="Blog navigation">
                <Link href="/blog" transitionTypes={["blog-close"]}>
                  ← All posts
                </Link>
              </nav>
              <div className={paperStyles.copy}>
                <ViewTransition
                  name={`post-title-${post.slug}`}
                  default="none"
                  share="blog-title"
                >
                  <h1 className={paperStyles.title}>{post.title}</h1>
                </ViewTransition>
                <p className={paperStyles.summary}>{post.summary}</p>
                <p className={paperStyles.metadata}>
                  {post.status === "draft"
                    ? "Draft · Dev only · "
                    : "Published "}
                  <time dateTime={post.publishedAt}>{post.publishedAt}</time>
                  {post.updatedAt ? (
                    <>
                      {" "}
                      · Updated{" "}
                      <time dateTime={post.updatedAt}>{post.updatedAt}</time>
                    </>
                  ) : null}
                </p>
              </div>
            </PaperValley>
          ) : (
            <header
              className={cn(
                styles.postHeader,
                hasParticleHeader && styles.particlePostHeader,
                hasLandscapeHeader && styles.landscapePostHeader,
                hasSvgHeader && styles.svgPostHeader,
              )}
            >
              <ViewTransition
                name={`post-title-${post.slug}`}
                default="none"
                share="blog-title"
              >
                <Typography
                  as="h1"
                  variant="articleTitle"
                  className={cn(
                    styles.title,
                    hasLandscapeHeader && styles.landscapeTitle,
                  )}
                >
                  {titleSeparator > -1 ? (
                    <>
                      <span className={styles.landscapeSeries}>
                        {post.title.slice(0, titleSeparator + 1)}
                      </span>{" "}
                      <span className={styles.landscapeHeadline}>
                        {post.title.slice(titleSeparator + 2)}
                      </span>
                    </>
                  ) : hasLandscapeHeader ? (
                    <span className={styles.landscapeHeadline}>
                      {post.title}
                    </span>
                  ) : (
                    post.title
                  )}
                </Typography>
              </ViewTransition>
              <Typography
                as="p"
                variant="articleDeck"
                className={cn(
                  styles.summary,
                  hasLandscapeHeader && styles.landscapeSummary,
                  hasParticleHeader && "text-[#c3ccd9]",
                )}
              >
                {post.summary}
              </Typography>
              <Typography
                as="p"
                variant="articleMetadata"
                className={cn(
                  styles.metadata,
                  hasLandscapeHeader && styles.landscapeMetadata,
                )}
              >
                {post.status === "draft" ? "Draft · Dev only · " : "Published "}
                <time dateTime={post.publishedAt}>{post.publishedAt}</time>
                {post.updatedAt ? (
                  <>
                    {" · Updated "}
                    <time dateTime={post.updatedAt}>{post.updatedAt}</time>
                  </>
                ) : null}
              </Typography>
              {hasSvgHeader ? (
                <ColorfulSVGPattern className={styles.svgHeaderPattern} />
              ) : null}
              {hasParticleHeader ? (
                <ParticleHeaderBackground
                  canvasClassName={styles.particleHeaderCanvas}
                  controlsClassName={styles.particleHeaderControls}
                />
              ) : null}
            </header>
          )}
          <Typography as="div" variant="articleProse" className={styles.prose}>
            <Content />
          </Typography>
        </article>
        <nav aria-label="Adjacent posts" className={styles.postNavigation}>
          <div>
            {adjacentPosts.previous ? (
              <Link
                className={typographyVariants({
                  variant: "articleNavigationTitle",
                  className: `${styles.link} ${styles.navigationLink}`,
                })}
                href={`/blog/${adjacentPosts.previous.slug}`}
                transitionTypes={["nav-back"]}
              >
                <Typography
                  variant="articleNavigationLabel"
                  className={styles.navigationLabel}
                >
                  Previous
                </Typography>
                {adjacentPosts.previous.title}
              </Link>
            ) : null}
          </div>
          <div className={styles.nextPost}>
            {adjacentPosts.next ? (
              <Link
                className={typographyVariants({
                  variant: "articleNavigationTitle",
                  className: `${styles.link} ${styles.navigationLink}`,
                })}
                href={`/blog/${adjacentPosts.next.slug}`}
                transitionTypes={["nav-forward"]}
              >
                <Typography
                  variant="articleNavigationLabel"
                  className={styles.navigationLabel}
                >
                  Next
                </Typography>
                {adjacentPosts.next.title}
              </Link>
            ) : null}
          </div>
        </nav>
      </Typography>
    </BlogTransition>
  );
}
