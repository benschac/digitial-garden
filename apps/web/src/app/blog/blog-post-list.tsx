"use client";

import Link from "next/link";
import { useRef, useState, ViewTransition } from "react";

import { Typography } from "@/components/page-typography";
import type { PostSummary } from "@/lib/content/schema";

import { ArticleSurface } from "./article-surface";
import { matchesBlogPost } from "./blog-filter";
import styles from "./index-styles";

export const BlogPostList = ({ posts }: { posts: readonly PostSummary[] }) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const filteredPosts = posts.filter((post) => matchesBlogPost(post, query));

  return (
    <div className={styles.listColumn}>
      <div className={styles.filter}>
        <label htmlFor="blog-search" className={styles.filterLabel}>
          Search articles
        </label>
        <div className={styles.filterControls}>
          <input
            ref={inputRef}
            id="blog-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
            }}
            aria-controls="posts"
            className={styles.searchInput}
            placeholder="Search titles and summaries"
          />
          <button
            type="button"
            disabled={query.length === 0}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className={styles.clearButton}
          >
            Clear
          </button>
        </div>
        <output
          htmlFor="blog-search"
          className={styles.resultCount}
          aria-atomic="true"
        >
          {filteredPosts.length}{" "}
          {filteredPosts.length === 1 ? "article" : "articles"}
        </output>
      </div>
      <ol
        className={styles.postList}
        id="posts"
        tabIndex={-1}
        aria-label="Articles"
      >
        {filteredPosts.map((post) => (
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
                    data-cuelume-navigate=""
                    data-cuelume-emphasis="subtle"
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
                {post.status === "draft" ? "Draft · Dev only · " : null}
                <time dateTime={post.publishedAt}>
                  {new Intl.DateTimeFormat("en-US", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                    year: "numeric",
                  }).format(new Date(`${post.publishedAt}T00:00:00Z`))}
                </time>
              </Typography>
            </article>
          </li>
        ))}
      </ol>
      {filteredPosts.length === 0 ? (
        <p className={styles.emptyState}>
          {posts.length === 0
            ? "No articles published yet."
            : "No articles match your search."}
        </p>
      ) : null}
    </div>
  );
};
