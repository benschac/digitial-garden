import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/content";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "Blog",
  description: "Writing about software, experiments, and interaction design.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <main className={styles.page}>
      <header className={styles.masthead}>
        <Link className={styles.siteLink} href="/">
          Benjamin Schachter
        </Link>
        <div>
          <p className={styles.eyebrow}>Selected writing</p>
          <h1>Blog</h1>
          <p className={styles.mastheadDeck}>
            Notes from the workbench: software, systems, and interaction.
          </p>
        </div>
      </header>
      <ol className={styles.postList}>
        {posts.map((post) => (
          <li key={post.slug}>
            <article>
              <p className={styles.postDate}>
                <time dateTime={post.publishedAt}>{post.publishedAt}</time>
              </p>
              <h2>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className={styles.postSummary}>{post.summary}</p>
              <ul aria-label="Tags" className={styles.tags}>
                {post.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>
    </main>
  );
}
