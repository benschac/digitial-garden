import {
  Typography,
  typographyVariants,
} from "@personal-site/ui/components/typography";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/app/_components/page-transition";
import styles from "../home.module.css";

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
          className: styles.page,
        })}
      >
        <Typography as="h1" variant="playgroundTitle">
          Playground
        </Typography>
        <Typography as="p" variant="playgroundLead">
          Experiments to explore and play with.
        </Typography>
        <nav aria-label="Playground" className={styles.links}>
          <Link
            href="/experiments/wasm-canvas"
            transitionTypes={["nav-forward"]}
          >
            Explore WebGPU particles →
          </Link>
          <Link
            href="/experiments/perlin-noise"
            transitionTypes={["nav-forward"]}
          >
            Compare Perlin noise →
          </Link>
          <Link
            href="/experiments/vector-math"
            transitionTypes={["nav-forward"]}
          >
            Play with vector math →
          </Link>
          <Link href="/experiments/forces" transitionTypes={["nav-forward"]}>
            Explore forces →
          </Link>
          <Link href="/" transitionTypes={["nav-back"]}>
            ← Back home
          </Link>
        </nav>
      </main>
    </PageTransition>
  );
}
