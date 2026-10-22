import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Typography } from "@/components/page-typography";

import { PageTransition } from "../_components/page-transition";

export const metadata: Metadata = {
  title: "How I work",
  description:
    "How Benjamin Schachter works with AI, from early GitHub Copilot to Codex, skills, and agent orchestration.",
  alternates: { canonical: "/how-i-work" },
};

export default function HowIWorkLayout({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      <main className="ui-article-typography mx-auto max-w-3xl px-6 py-8 text-ink sm:px-8 sm:py-12">
        <nav aria-label="How I work navigation" className="mb-12 sm:mb-16">
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4"
          >
            <span aria-hidden="true">←</span> Workbench
          </Link>
        </nav>
        <article>
          <header className="mb-10 sm:mb-12">
            <Typography as="h1" variant="articleTitle">
              How I work
            </Typography>
          </header>
          <Typography as="div" variant="articleProse">
            {children}
          </Typography>
        </article>
      </main>
    </PageTransition>
  );
}
