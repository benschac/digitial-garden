import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { Typography } from "@/components/page-typography";
import { getPublishedPosts } from "@/lib/content";
import { ArticleSurface } from "./article-surface";
import { BlogTransition } from "./blog-transition";
import styles from "./index-styles";

export const metadata: Metadata = {
  title: "Blog",
  description: "Writing about software, experiments, and interaction design.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <BlogTransition view="index">
      <Typography as="main" variant="journalReading" className={styles.page}>
        <a className={`${styles.link} ${styles.skipLink}`} href="#posts">
          Skip to articles
        </a>
        <div className={styles.shell}>
          <div className={styles.layout}>
            <div>
              <Typography
                as="h1"
                variant="journalTitle"
                className={styles.title}
              >
                Blog
              </Typography>
            </div>
            <ol
              className={styles.postList}
              id="posts"
              tabIndex={-1}
              aria-label="Articles"
            >
              {posts.map((post) => (
                <li key={post.slug} className={styles.postItem}>
                  <ArticleSurface slug={post.slug} className={styles.surface} />
                  <article className={styles.post}>
                    <ViewTransition
                      name={`post-title-${post.slug}`}
                      default="none"
                      share="blog-title"
                    >
                      <Typography
                        as="h2"
                        variant="journalPostTitle"
                        className={styles.postTitle}
                      >
                        <Link
                          className={`${styles.link} ${styles.postLink}`}
                          href={`/blog/${post.slug}`}
                          transitionTypes={["blog-open"]}
                        >
                          {post.title}
                        </Link>
                      </Typography>
                    </ViewTransition>
                    <Typography
                      as="p"
                      variant="journalSummary"
                      className={styles.postSummary}
                    >
                      {post.summary}
                    </Typography>
                    <Typography
                      as="p"
                      variant="journalDate"
                      className={styles.postDate}
                    >
                      <time dateTime={post.publishedAt}>
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        }).format(new Date(`${post.publishedAt}T00:00:00Z`))}
                      </time>
                    </Typography>
                  </article>
                </li>
              ))}
            </ol>
            {posts.length === 0 ? <p>No articles published yet.</p> : null}
          </div>
        </div>
      </Typography>
    </BlogTransition>
  );
}
