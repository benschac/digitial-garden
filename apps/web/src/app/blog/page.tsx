import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { getPublishedPosts } from "@/lib/content";
import { ArticleSurface } from "./article-surface";
import { BlogTransition } from "./blog-transition";
import styles from "./index.module.css";

export const metadata: Metadata = {
  title: "Blog",
  description: "Writing about software, experiments, and interaction design.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <BlogTransition view="index">
      <main className={styles.page}>
        <a className={styles.skipLink} href="#posts">
          Skip to articles
        </a>
        <div className={styles.shell}>
          <div className={styles.layout}>
            <div className={styles.introduction}>
              <h1>Blog</h1>
            </div>
            <ol
              className={styles.postList}
              id="posts"
              tabIndex={-1}
              aria-label="Articles"
            >
              {posts.map((post) => (
                <li key={post.slug}>
                  <ArticleSurface slug={post.slug} className={styles.surface} />
                  <article>
                    <ViewTransition
                      name={`post-title-${post.slug}`}
                      default="none"
                      share="blog-title"
                    >
                      <h2>
                        <Link
                          href={`/blog/${post.slug}`}
                          transitionTypes={["blog-open"]}
                        >
                          {post.title}
                        </Link>
                      </h2>
                    </ViewTransition>
                    <p className={styles.postSummary}>{post.summary}</p>
                    <p className={styles.postDate}>
                      <time dateTime={post.publishedAt}>
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        }).format(new Date(`${post.publishedAt}T00:00:00Z`))}
                      </time>
                    </p>
                  </article>
                </li>
              ))}
            </ol>
            {posts.length === 0 ? <p>No articles published yet.</p> : null}
          </div>
        </div>
      </main>
    </BlogTransition>
  );
}
