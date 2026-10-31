import { Eyebrow } from "@personal-site/ui/components/eyebrow";
import { PageNavigation } from "@personal-site/ui/components/page-navigation";
import type { Metadata } from "next";
import Link from "next/link";

import { PageTransition } from "@/app/_components/page-transition";
import { Typography, typographyVariants } from "@/components/page-typography";

import { PerlinNoise3DExperiment } from "./perlin-noise-3d-loader";
import { PerlinNoiseExperiment } from "./perlin-noise-experiment";
import styles from "./perlin-noise-styles";

export const metadata: Metadata = {
  alternates: { canonical: "/experiments/perlin-noise" },
  description:
    "Visual 2D and 3D comparisons of matching Perlin noise implementations in TypeScript and Rust/WASM.",
  title: "Perlin Noise, Twice",
};

/**
 * Defines the server-rendered shell for the Perlin noise comparison route.
 *
 * Keeping the route shell on the server allows Next.js to emit static metadata
 * and introductory content while the interactive canvases remain isolated in
 * the client-only {@link PerlinNoiseExperiment} boundary.
 *
 * @returns The complete `/experiments/perlin-noise` page.
 */
const PerlinNoisePage = () => (
  <PageTransition>
    <main
      className={typographyVariants({
        className: styles.page,
        variant: "experimentPage",
      })}
    >
      <PageNavigation className={styles.nav}>
        <Link
          className={styles.navLink}
          href={process.env.NODE_ENV === "development" ? "/reading" : "/"}
          aria-label={
            process.env.NODE_ENV === "development"
              ? "Back to Reading"
              : "Back home"
          }
          transitionTypes={["nav-back"]}
        >
          <span aria-hidden="true">←</span>
        </Link>
        <span>Experiment 002</span>
      </PageNavigation>

      <header className={styles.header}>
        <Eyebrow className={`mb-4 ${styles.eyebrow}`}>
          TypeScript · Rust/WASM · Canvas
        </Eyebrow>
        <Typography
          as="h1"
          className={styles.title}
          variant="experimentNoiseDisplay"
        >
          Same field. Two runtimes.
        </Typography>
        <Typography
          as="p"
          variant="experimentNoiseIntro"
          className={styles.intro}
        >
          Deterministic Perlin noise runs once in TypeScript and once in
          compiled Rust. Compare pixels in 2D, then move through the same field
          as two 3D surfaces.
        </Typography>
      </header>

      <PerlinNoiseExperiment />
      <PerlinNoise3DExperiment />

      <aside
        className={typographyVariants({
          className: styles.notes,
          variant: "experimentNotes",
        })}
      >
        <p className={styles.note}>
          Every 2D pixel and 3D vertex samples the same coordinate from the same
          permutation table. Timing is measured in-browser and is deliberately
          approximate; the useful assertion is the numerical difference.
        </p>
      </aside>
    </main>
  </PageTransition>
);

export default PerlinNoisePage;
