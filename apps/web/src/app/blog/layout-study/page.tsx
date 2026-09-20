import {
  Typography,
  typographyVariants,
} from "@personal-site/ui/components/typography";
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

function Post({
  post,
  direction,
  featured,
}: {
  post: PostSummary;
  direction: Direction;
  featured: boolean;
}) {
  return (
    <article className={styles.post}>
      <Typography as="time" variant="studyDate" dateTime={post.publishedAt}>
        {dateFormat.format(new Date(`${post.publishedAt}T00:00:00Z`))}
      </Typography>
      <Typography
        as="h3"
        variant={
          direction === "feature"
            ? featured
              ? "studyFeaturedTitle"
              : "studyCardTitle"
            : "studyPostTitle"
        }
      >
        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
      </Typography>
      <Typography as="p" variant="studySummary">
        {post.summary}
      </Typography>
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
        <Typography
          as="header"
          variant="studyMasthead"
          className={styles.masthead}
        >
          <Link
            className={typographyVariants({ variant: "studySiteLink" })}
            href="/"
          >
            Benjamin Schachter
          </Link>
          <span>Writing</span>
        </Typography>
        <div className={styles.intro}>
          <Typography as="h2" variant="studyBlogTitle">
            Blog
          </Typography>
          <Typography as="p" variant="studyIntroduction">
            Notes on software, systems, and interaction.
          </Typography>
        </div>
        {direction === "archive" ? (
          <div className={styles.years}>
            {years.map((year) => (
              <section
                className={styles.year}
                key={year}
                aria-label={`Articles from ${year}`}
              >
                <Typography as="h3" variant="studyYear">
                  {year}
                </Typography>
                <ul>
                  {posts
                    .filter((post) => post.publishedAt.startsWith(year))
                    .map((post) => (
                      <li key={post.slug}>
                        <Link
                          className={typographyVariants({
                            variant: "studyArchiveTitle",
                          })}
                          href={`/blog/${post.slug}`}
                        >
                          {post.title}
                          <span aria-hidden="true">↗</span>
                        </Link>
                        <Typography
                          as="time"
                          variant="studyDate"
                          dateTime={post.publishedAt}
                        >
                          {dateFormat
                            .format(new Date(`${post.publishedAt}T00:00:00Z`))
                            .replace(`, ${year}`, "")}
                        </Typography>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <ol className={styles.posts} aria-label="Articles, newest first">
            {posts.map((post, index) => (
              <li key={post.slug}>
                <Post
                  post={post}
                  direction={direction}
                  featured={index === 0}
                />
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
    <Typography as="main" variant="studyInterface" className={styles.study}>
      <header className={styles.studyHeader}>
        <div>
          <Typography as="h1" variant="studyTitle">
            {selected ? selected.label : "Three ways into the writing"}
          </Typography>
          <Typography as="p" variant="studyDescription">
            {selected
              ? selected.note
              : "Same posts, different reading structures. Open each layout to judge it at full width."}
          </Typography>
        </div>
        <Link
          className={typographyVariants({ variant: "studyNavigation" })}
          href={selected ? "/blog/layout-study" : "/blog"}
        >
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
                <Typography as="h2" variant="studyOptionTitle">
                  <Link href={`/blog/layout-study?view=${direction.id}`}>
                    {direction.label} <span aria-hidden="true">↗</span>
                  </Link>
                </Typography>
                <Typography as="p" variant="studyDescription">
                  {direction.note}
                </Typography>
              </header>
              <Prototype direction={direction.id} posts={posts} />
            </section>
          ))}
        </div>
      )}
    </Typography>
  );
}
