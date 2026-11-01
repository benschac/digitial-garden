import { Eyebrow } from "@personal-site/ui/components/eyebrow";
import { PageNavigation } from "@personal-site/ui/components/page-navigation";
import type { Metadata } from "next";
import Link from "next/link";

import { PageTransition } from "@/app/_components/page-transition";
import { Typography, typographyVariants } from "@/components/page-typography";

import styles from "../wasm-canvas/wasm-canvas-styles";
import { TypeGpuParticles } from "./typegpu-particles";

export const metadata: Metadata = {
  alternates: { canonical: "/experiments/typegpu-particles" },
  description:
    "A side-by-side TypeGPU port of the Rust/WASM WebGPU particle field.",
  title: "TypeGPU Particle Field",
};

const TypeGpuParticlesPage = () => (
  <PageTransition>
    <main
      className={typographyVariants({
        className: styles.page,
        variant: "experimentParticlePage",
      })}
    >
      <PageNavigation
        className={typographyVariants({
          className: styles.nav,
          variant: "experimentParticleNav",
        })}
      >
        <Link
          className={styles.navLink}
          href="/experiments/wasm-canvas"
          transitionTypes={["nav-lateral"]}
        >
          ← Raw WebGPU
        </Link>
        <span>Experiment 001B</span>
      </PageNavigation>
      <header className={styles.header}>
        <Eyebrow
          className={typographyVariants({
            className: `mb-5 ${styles.eyebrow}`,
            variant: "experimentParticleEyebrow",
          })}
        >
          Rust/WASM · TypeGPU · WGSL
        </Eyebrow>
        <Typography
          as="h1"
          className={styles.title}
          variant="experimentParticleDisplay"
        >
          The same field, through TypeGPU.
        </Typography>
        <Typography
          as="p"
          variant="experimentParticleIntro"
          className={styles.intro}
        >
          This is a behavioral copy of the raw WebGPU particle experiment. It
          keeps the same Rust frame protocol, GPU-resident state, controls, and
          Canvas fallback while TypeGPU owns the typed resource and layout
          layer.
        </Typography>
      </header>
      <TypeGpuParticles />
      <aside
        className={typographyVariants({
          className: styles.notes,
          variant: "experimentNotes",
        })}
      >
        <p className={styles.note}>
          Use the raw WebGPU link above to compare the two implementations. Both
          versions run the same visual system; the difference is how the
          browser-side GPU resources and bindings are described and wired.
        </p>
      </aside>
    </main>
  </PageTransition>
);

export default TypeGpuParticlesPage;
