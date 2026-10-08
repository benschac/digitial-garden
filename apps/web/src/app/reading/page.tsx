import {
  Heading,
  Text,
  typographyVariants,
} from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTransition } from "@/app/_components/page-transition";
import { getPublishedPosts } from "@/lib/content";

const focusRing =
  "focus-visible:outline-[3px] focus-visible:outline-current focus-visible:outline-offset-4";
const readingLink = cn(
  "inline-flex min-h-11 items-center text-inherit underline underline-offset-[0.16em]",
  focusRing,
);

export const metadata: Metadata = {
  title: "Reading",
  description:
    "Writing about software, experiments, and what I learn along the way.",
  alternates: { canonical: "/reading" },
};

export default async function ReadingPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const posts = await getPublishedPosts();

  return (
    <PageTransition>
      <main
        className={cn(
          "mx-auto max-w-3xl p-[clamp(1.5rem,4vw,3rem)]",
          "text-ink",
          typographyVariants({ variant: "ui" }),
        )}
      >
        <Heading as="h1" variant="display" className="max-w-[12ch]">
          Reading
        </Heading>
        <Text className="mt-5 mb-8 max-w-[36ch]">
          Writing about software, experiments, and what I learn along the way.
        </Text>
        <Heading as="h2" variant="section" className="mb-6">
          From the blog
        </Heading>
        <ol className="m-0 grid list-none gap-8 p-0">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="max-w-[65ch]">
                <Text variant="date" className="mb-2">
                  <time dateTime={post.publishedAt}>
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(`${post.publishedAt}T00:00:00Z`))}
                  </time>
                </Text>
                <Heading
                  as="h3"
                  variant="item"
                  className="mb-2 text-balance font-[family-name:var(--home-entry-font,var(--font-sans))]"
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    transitionTypes={["nav-forward"]}
                    className={cn(
                      "text-inherit underline decoration-[color-mix(in_srgb,currentColor_40%,transparent)] underline-offset-[0.16em]",
                      "hover:decoration-current focus-visible:decoration-current",
                      focusRing,
                    )}
                  >
                    {post.title}
                  </Link>
                </Heading>
                <Text>{post.summary}</Text>
              </article>
            </li>
          ))}
        </ol>
        <nav
          aria-label="More reading and experiments"
          className="mt-6 flex flex-wrap gap-x-6 gap-y-2"
        >
          <Link
            className={readingLink}
            href="/blog"
            transitionTypes={["nav-forward"]}
          >
            Browse the blog <span aria-hidden="true">&nbsp;→</span>
          </Link>
          <Link
            className={readingLink}
            href="/playground"
            transitionTypes={["nav-forward"]}
          >
            Explore the playground <span aria-hidden="true">&nbsp;→</span>
          </Link>
          <Link className={readingLink} href="/" transitionTypes={["nav-back"]}>
            <span aria-hidden="true">←&nbsp;</span> Back home
          </Link>
        </nav>
      </main>
    </PageTransition>
  );
}
