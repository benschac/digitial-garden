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
    <main>
      <header>
        <Link href="/">Benjamin Schachter</Link>
        <h1>Blog</h1>
        <p>Notes from the workbench: software, systems, and interaction.</p>
      </header>
      <ol>
        {posts.map((post) => (
          <li key={post.slug}>
            <article>
              <p>
                <time dateTime={post.publishedAt}>{post.publishedAt}</time>
              </p>
              <h2>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p>{post.summary}</p>
              <ul aria-label="Tags">
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
