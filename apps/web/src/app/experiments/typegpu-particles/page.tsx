import { Eyebrow } from "@personal-site/ui/components/eyebrow";
import { PageNavigation } from "@personal-site/ui/components/page-navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/app/_components/page-transition";
import { Typography, typographyVariants } from "@/components/page-typography";
import styles from "../wasm-canvas/wasm-canvas-styles";
import { TypeGpuParticles } from "./typegpu-particles";

export const metadata: Metadata = {
  title: "TypeGPU Particle Field",
  description:
    "A side-by-side TypeGPU port of the Rust/WASM WebGPU particle field.",
  alternates: { canonical: "/experiments/typegpu-particles" },
};

export default function TypeGpuParticlesPage() {
  return (
    <PageTransition>
      <main
        className={typographyVariants({
          variant: "experimentParticlePage",
          className: styles.page,
        })}
      >
        <PageNavigation
          className={typographyVariants({
            variant: "experimentParticleNav",
            className: styles.nav,
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
              variant: "experimentParticleEyebrow",
              className: `mb-5 ${styles.eyebrow}`,
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
            keeps the same Rust frame protocol, GPU-resident state, controls,
            and Canvas fallback while TypeGPU owns the typed resource and layout
            layer.
          </Typography>
        </header>
        <TypeGpuParticles />
        <aside
          className={typographyVariants({
            variant: "experimentNotes",
            className: styles.notes,
          })}
        >
          <p className={styles.note}>
            Use the raw WebGPU link above to compare the two implementations.
            Both versions run the same visual system; the difference is how the
            browser-side GPU resources and bindings are described and wired.
          </p>
        </aside>
      </main>
    </PageTransition>
  );
}
