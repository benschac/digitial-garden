import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog",
  description: "Writing about software, experiments, and interaction design.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <main className="shell">
      <header className="page-header">
        <Link href="/">Benjamin Schachter</Link>
        <h1>Blog</h1>
        <p>Notes from the workbench: software, systems, and interaction.</p>
      </header>
      <ol className="post-list">
        {posts.map((post) => (
          <li key={post.slug}>
            <article>
              <p className="eyebrow">
                <time dateTime={post.publishedAt}>{post.publishedAt}</time>
              </p>
              <h2>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p>{post.summary}</p>
              <ul aria-label="Tags" className="tag-list">
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
