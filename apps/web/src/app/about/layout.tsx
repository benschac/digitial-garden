import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Typography } from "@/components/page-typography";

import { PageTransition } from "../_components/page-transition";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  description:
    "About Benjamin Schachter, with notes on motivation, learning, and work worth doing.",
  title: "About",
};

const AboutLayout = ({ children }: { children: ReactNode }) => {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <PageTransition>
      <main className="ui-article-typography mx-auto max-w-3xl px-6 py-8 text-ink sm:px-8 sm:py-12">
        <nav aria-label="About navigation" className="mb-12 sm:mb-16">
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
              About me
            </Typography>
          </header>
          <Typography as="div" variant="articleProse">
            {children}
          </Typography>
        </article>
      </main>
    </PageTransition>
  );
};

export default AboutLayout;
