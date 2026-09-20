import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPosts } from "@/lib/content";
import type { PostSummary } from "@/lib/content/schema";
import styles from "./study.module.css";

export const metadata: Metadata = {
  title: "Blog layout study",
  robots: { index: false, follow: false },
};

const directions = [
  {
    id: "reader",
    label: "A — Reading column",
    note: "One continuous reading path. Full summaries, a comfortable measure, and quiet dates. Best for choosing what to read.",
  },
  {
    id: "archive",
    label: "B — Year index",
    note: "A compact, title-first archive grouped by year. Best for scanning the entire collection; less context before opening a post.",
  },
  {
    id: "feature",
    label: "C — Featured + cards",
    note: "One clear starting point, then self-contained articles in a grid. More variety, with a less linear reading order.",
  },
] as const;

type Direction = (typeof directions)[number]["id"];
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function Post({ post }: { post: PostSummary }) {
  return (
    <article className={styles.post}>
      <time dateTime={post.publishedAt}>
        {dateFormat.format(new Date(`${post.publishedAt}T00:00:00Z`))}
      </time>
      <h3>
        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
      </h3>
      <p>{post.summary}</p>
    </article>
  );
}

function Prototype({
  direction,
  posts,
}: {
  direction: Direction;
  posts: PostSummary[];
}) {
  const years = [...new Set(posts.map((post) => post.publishedAt.slice(0, 4)))];
  return (
    <div className={`${styles.prototype} ${styles[direction]}`}>
      <div className={styles.sheet}>
        <header className={styles.masthead}>
          <Link href="/">Benjamin Schachter</Link>
          <span>Writing</span>
        </header>
        <div className={styles.intro}>
          <h2>Blog</h2>
          <p>Notes on software, systems, and interaction.</p>
        </div>
        {direction === "archive" ? (
          <div className={styles.years}>
            {years.map((year) => (
              <section
                className={styles.year}
                key={year}
                aria-label={`Articles from ${year}`}
              >
                <h3>{year}</h3>
                <ul>
                  {posts
                    .filter((post) => post.publishedAt.startsWith(year))
                    .map((post) => (
                      <li key={post.slug}>
                        <Link href={`/blog/${post.slug}`}>
                          {post.title}
                          <span aria-hidden="true">↗</span>
                        </Link>
                        <time dateTime={post.publishedAt}>
                          {dateFormat
                            .format(new Date(`${post.publishedAt}T00:00:00Z`))
                            .replace(`, ${year}`, "")}
                        </time>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <ol className={styles.posts} aria-label="Articles, newest first">
            {posts.map((post) => (
              <li key={post.slug}>
                <Post post={post} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export default async function LayoutStudy({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const [posts, query] = await Promise.all([getPublishedPosts(), searchParams]);
  const selected = directions.find((direction) => direction.id === query.view);
  return (
    <main className={styles.study}>
      <header className={styles.studyHeader}>
        <div>
          <h1>{selected ? selected.label : "Three ways into the writing"}</h1>
          <p>
            {selected
              ? selected.note
              : "Same posts, different reading structures. Open each layout to judge it at full width."}
          </p>
        </div>
        <Link href={selected ? "/blog/layout-study" : "/blog"}>
          {selected ? "Compare all three" : "Current blog"}
        </Link>
      </header>
      {selected ? (
        <Prototype direction={selected.id} posts={posts} />
      ) : (
        <div className={styles.comparison}>
          {directions.map((direction) => (
            <section
              className={styles.option}
              key={direction.id}
              aria-label={direction.label}
            >
              <header className={styles.optionHeader}>
                <h2>
                  <Link href={`/blog/layout-study?view=${direction.id}`}>
                    {direction.label} <span aria-hidden="true">↗</span>
                  </Link>
                </h2>
                <p>{direction.note}</p>
              </header>
              <Prototype direction={direction.id} posts={posts} />
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
