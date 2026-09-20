import { cn } from "@personal-site/ui/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/app/_components/page-transition";
import { Typography, typographyVariants } from "@/components/page-typography";

const playgroundLink = cn(
  "min-h-11 text-inherit underline-offset-[0.16em]",
  "focus-visible:outline-[3px] focus-visible:outline-current focus-visible:outline-offset-4",
);

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Interactive experiments with particles, noise, vectors, and forces.",
  alternates: { canonical: "/playground" },
};

export default function PlaygroundPage() {
  return (
    <PageTransition>
      <main
        className={typographyVariants({
          variant: "ui",
          className: "max-w-3xl p-[clamp(1.5rem,4vw,3rem)] text-ink",
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
        <nav
          aria-label="Playground"
          className="flex flex-col items-start gap-3"
        >
          <Link
            className={playgroundLink}
            href="/experiments/wasm-canvas"
            transitionTypes={["nav-forward"]}
          >
            Explore WebGPU particles →
          </Link>
          <Link
            className={playgroundLink}
            href="/experiments/perlin-noise"
            transitionTypes={["nav-forward"]}
          >
            Compare Perlin noise →
          </Link>
          <Link
            className={playgroundLink}
            href="/experiments/vector-math"
            transitionTypes={["nav-forward"]}
          >
            Play with vector math →
          </Link>
          <Link
            className={playgroundLink}
            href="/experiments/forces"
            transitionTypes={["nav-forward"]}
          >
            Explore forces →
          </Link>
          <Link
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
}
