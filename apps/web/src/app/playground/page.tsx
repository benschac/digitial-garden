import { cn } from "@personal-site/ui/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";

import { PageTransition } from "@/app/_components/page-transition";
import { Typography, typographyVariants } from "@/components/page-typography";

const playgroundLink = cn(
  "min-h-11 text-inherit underline-offset-[0.16em]",
  "focus-visible:outline-[3px] focus-visible:outline-current focus-visible:outline-offset-4"
);

export const metadata: Metadata = {
  alternates: { canonical: "/playground" },
  description:
    "Interactive experiments with particles, noise, vectors, and forces.",
  title: "Playground",
};

const PlaygroundPage = () => (
  <PageTransition>
    <main
      className={typographyVariants({
        className: "max-w-3xl p-[clamp(1.5rem,4vw,3rem)] text-ink",
        variant: "ui",
      })}
    >
      <Typography
        as="h1"
        variant="playgroundTitle"
        className="m-0 max-w-[12ch]"
      >
        Playground
      </Typography>
      <Typography
        as="p"
        variant="playgroundLead"
        className="mt-5 mb-8 max-w-[36ch] text-editorial-muted"
      >
        Experiments to explore and play with.
      </Typography>
      <nav aria-label="Playground" className="flex flex-col items-start gap-3">
        <Link
          data-cuelume-navigate=""
          data-cuelume-emphasis="subtle"
          className={playgroundLink}
          href="/experiments/wasm-canvas"
          transitionTypes={["nav-forward"]}
        >
          Explore WebGPU particles →
        </Link>
        <Link
          data-cuelume-navigate=""
          data-cuelume-emphasis="subtle"
          className={playgroundLink}
          href="/experiments/perlin-noise"
          transitionTypes={["nav-forward"]}
        >
          Compare Perlin noise →
        </Link>
        <Link
          data-cuelume-navigate=""
          data-cuelume-emphasis="subtle"
          className={playgroundLink}
          href="/experiments/vector-math"
          transitionTypes={["nav-forward"]}
        >
          Play with vector math →
        </Link>
        <Link
          data-cuelume-navigate=""
          data-cuelume-emphasis="subtle"
          className={playgroundLink}
          href="/experiments/forces"
          transitionTypes={["nav-forward"]}
        >
          Explore forces →
        </Link>
        <Link
          data-cuelume-navigate=""
          data-cuelume-emphasis="subtle"
          className={playgroundLink}
          href="/"
          transitionTypes={["nav-back"]}
        >
          ← Back home
        </Link>
      </nav>
    </main>
  </PageTransition>
);

export default PlaygroundPage;
