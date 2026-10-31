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
import styles from "./article-styles";

import paperStyles from "../paper-valley.module.css";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export const generateStaticParams = async () => {
  const slugs = await getAllPostSlugs();

  return slugs.map((slug) => ({ slug }));
};

export const generateMetadata = async ({
  params,
}: BlogPostPageProps): Promise<Metadata> => {
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
    alternates: { canonical },
    description: post.summary,
    openGraph: {
      description: post.summary,
      images,
      modifiedTime: post.updatedAt,
      publishedTime: post.publishedAt,
      tags: post.tags,
      title: post.title,
      type: "article",
    },
    robots:
      post.status === "draft" ? { follow: false, index: false } : undefined,
    title: post.title,
    twitter: {
      card: images ? "summary_large_image" : "summary",
      description: post.summary,
      images: images?.map((image) => image.url),
      title: post.title,
    },
  };
};

const BlogPostPage = async ({ params }: BlogPostPageProps) => {
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

  return (
    <BlogTransition key={slug} name="blog-post-page" view="article">
      <Typography as="main" variant="ui" className={styles.page}>
        <ArticleSurface slug={post.slug} className={styles.surface} expanded />
        {!hasLandscapeHeader && (
          <nav
            aria-label="Blog navigation"
            className={cn(
              styles.backNavigation,
              hasParticleHeader && styles.particleBackNavigation
            )}
          >
            <Link
              data-cuelume-navigate=""
              data-cuelume-emphasis="subtle"
              className={typographyVariants({
                className: `${styles.link} ${styles.backLink}`,
                variant: "articleBackLink",
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
                <Link
                  data-cuelume-navigate=""
                  data-cuelume-emphasis="subtle"
                  href="/blog"
                  transitionTypes={["blog-close"]}
                >
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
                hasSvgHeader && styles.svgPostHeader
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
                    hasLandscapeHeader && styles.landscapeTitle
                  )}
                >
                  {post.title}
                </Typography>
              </ViewTransition>
              <Typography
                as="p"
                variant="articleDeck"
                className={cn(
                  styles.summary,
                  hasLandscapeHeader && styles.landscapeSummary,
                  hasParticleHeader && "text-[#c3ccd9]"
                )}
              >
                {post.summary}
              </Typography>
              <Typography
                as="p"
                variant="articleMetadata"
                className={cn(
                  styles.metadata,
                  hasLandscapeHeader && styles.landscapeMetadata
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
                data-cuelume-navigate=""
                data-cuelume-emphasis="subtle"
                className={typographyVariants({
                  className: `${styles.link} ${styles.navigationLink}`,
                  variant: "articleNavigationTitle",
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
                data-cuelume-navigate=""
                data-cuelume-emphasis="subtle"
                className={typographyVariants({
                  className: `${styles.link} ${styles.navigationLink}`,
                  variant: "articleNavigationTitle",
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
};

export default BlogPostPage;
