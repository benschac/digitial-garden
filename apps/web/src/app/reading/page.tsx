import {
  Heading,
  typographyVariants,
} from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageTransition } from "@/app/_components/page-transition";

const focusRing =
  "focus-visible:outline-[3px] focus-visible:outline-current focus-visible:outline-offset-4";

const readingLink = cn(
  "inline-flex min-h-11 items-center text-inherit underline underline-offset-[0.16em]",
  focusRing
);

export const metadata: Metadata = {
  alternates: { canonical: "/reading" },
  description: "What I'm currently reading.",
  title: "Reading",
};

const ReadingPage = () => {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <PageTransition>
      <main
        className={cn(
          "mx-auto max-w-3xl p-[clamp(1.5rem,4vw,3rem)]",
          "text-ink",
          typographyVariants({ variant: "ui" })
        )}
      >
        <header>
          <Heading as="h1" variant="display" className="max-w-[12ch]">
            Reading
          </Heading>
          <Link
            href="/"
            aria-label="Back home"
            transitionTypes={["nav-back"]}
            className={cn(
              "absolute top-[clamp(1.5rem,4vw,3rem)] left-[clamp(1.5rem,4vw,3rem)]",
              "inline-flex min-h-11 min-w-11 items-center justify-center",
              "text-2xl text-inherit no-underline",
              focusRing
            )}
          >
            <span aria-hidden="true">←</span>
          </Link>
        </header>
        <section aria-labelledby="reading-2026" className="mt-8">
          <Heading as="h2" variant="section" id="reading-2026" className="mb-4">
            2026
          </Heading>
          <Heading as="h3" variant="item" className="mb-2">
            Currently Reading
          </Heading>
          <ul className="m-0 list-disc pl-5">
            <li>
              <a
                className={readingLink}
                href="https://learning.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/"
              >
                Designing Data-Intensive Applications
              </a>
            </li>
            <li>
              <a className={readingLink} href="https://natureofcode.com/">
                The Nature of Code
              </a>
              <ul className="m-0 list-disc pl-5">
                <li>
                  <Link
                    className={readingLink}
                    href="/experiments/perlin-noise"
                    transitionTypes={["nav-forward"]}
                  >
                    Compare Perlin noise →
                  </Link>
                </li>
                <li>
                  <Link
                    className={readingLink}
                    href="/experiments/vector-math"
                    transitionTypes={["nav-forward"]}
                  >
                    Play with vector math →
                  </Link>
                </li>
              </ul>
            </li>
          </ul>
        </section>
      </main>
    </PageTransition>
  );
};

export default ReadingPage;
