import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Typography, typographyVariants } from "@/components/page-typography";
import { getPublishedPosts } from "@/lib/content";
import type { PostSummary } from "@/lib/content/schema";
import styles from "./study-styles";

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
    <article className={styles.post({ direction })}>
      <Typography
        as="time"
        variant="studyDate"
        className={styles.date}
        dateTime={post.publishedAt}
      >
        {dateFormat.format(new Date(`${post.publishedAt}T00:00:00Z`))}
      </Typography>
      <Typography
        as="h3"
        className={`${styles.postTitle}${featured && direction === "feature" ? ` ${styles.featuredTitle}` : ""}`}
        variant={
          direction === "feature"
            ? featured
              ? "studyFeaturedTitle"
              : "studyCardTitle"
            : "studyPostTitle"
        }
      >
        <Link
          className={`${styles.link} ${styles.postLink}`}
          href={`/blog/${post.slug}`}
        >
          {post.title}
        </Link>
      </Typography>
      <Typography as="p" variant="studySummary" className={styles.summary}>
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
    <div className={styles.prototype}>
      <div className={styles.sheet({ direction })}>
        <Typography
          as="header"
          variant="studyMasthead"
          className={styles.masthead}
        >
          <Link
            className={typographyVariants({
              variant: "studySiteLink",
              className: `${styles.link} ${styles.siteLink}`,
            })}
            href="/"
          >
            Benjamin Schachter
          </Link>
          <span className={styles.edition}>Writing</span>
        </Typography>
        <div className={styles.intro({ direction })}>
          <Typography
            as="h2"
            variant="studyBlogTitle"
            className={styles.blogTitle}
          >
            Blog
          </Typography>
          <Typography
            as="p"
            variant="studyIntroduction"
            className={styles.introduction}
          >
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
                <Typography
                  as="h3"
                  variant="studyYear"
                  className={styles.yearTitle}
                >
                  {year}
                </Typography>
                <ul className={styles.yearList}>
                  {posts
                    .filter((post) => post.publishedAt.startsWith(year))
                    .map((post) => (
                      <li key={post.slug} className={styles.yearItem}>
                        <Link
                          className={typographyVariants({
                            variant: "studyArchiveTitle",
                            className: `${styles.link} ${styles.archiveLink}`,
                          })}
                          href={`/blog/${post.slug}`}
                        >
                          {post.title}
                          <span
                            className={styles.archiveArrow}
                            aria-hidden="true"
                          >
                            ↗
                          </span>
                        </Link>
                        <Typography
                          as="time"
                          variant="studyDate"
                          className={`${styles.date} ${styles.archiveDate}`}
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
          <ol
            className={styles.posts({ direction })}
            aria-label="Articles, newest first"
          >
            {posts.map((post, index) => (
              <li
                key={post.slug}
                className={styles.postItem({
                  variant:
                    direction === "feature"
                      ? index === 0
                        ? "featured"
                        : "card"
                      : "plain",
                })}
              >
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
          <Typography
            as="h1"
            variant="studyTitle"
            className={styles.studyTitle}
          >
            {selected ? selected.label : "Three ways into the writing"}
          </Typography>
          <Typography
            as="p"
            variant="studyDescription"
            className={styles.description}
          >
            {selected
              ? selected.note
              : "Same posts, different reading structures. Open each layout to judge it at full width."}
          </Typography>
        </div>
        <Link
          className={typographyVariants({
            variant: "studyNavigation",
            className: `${styles.link} ${styles.navigationLink}`,
          })}
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
                <Typography
                  as="h2"
                  variant="studyOptionTitle"
                  className={styles.optionTitle}
                >
                  <Link
                    className={`${styles.link} ${styles.optionLink}`}
                    href={`/blog/layout-study?view=${direction.id}`}
                  >
                    {direction.label} <span aria-hidden="true">↗</span>
                  </Link>
                </Typography>
                <Typography
                  as="p"
                  variant="studyDescription"
                  className={styles.description}
                >
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
