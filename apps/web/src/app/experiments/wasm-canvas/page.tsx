import { Eyebrow } from "@personal-site/ui/components/eyebrow";
import { PageNavigation } from "@personal-site/ui/components/page-navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/app/_components/page-transition";
import { Typography, typographyVariants } from "@/components/page-typography";
import { WasmCanvas } from "./wasm-canvas";
import styles from "./wasm-canvas-styles";

export const metadata: Metadata = {
  title: "WebGPU Particle Field",
  description:
    "A WebGPU simulation that scales from 100,000 to 4.2 million particles.",
  alternates: { canonical: "/experiments/wasm-canvas" },
};

export default function WasmCanvasPage() {
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
            href="/"
            transitionTypes={["nav-back"]}
          >
            ← Workbench
          </Link>
          <Link
            className={styles.navLink}
            href="/experiments/typegpu-particles"
            transitionTypes={["nav-lateral"]}
          >
            TypeGPU copy →
          </Link>
        </PageNavigation>
        <header className={styles.header}>
          <Eyebrow
            className={typographyVariants({
              variant: "experimentParticleEyebrow",
              className: `mb-5 ${styles.eyebrow}`,
            })}
          >
            Rust/WASM · WebGPU · WGSL
          </Eyebrow>
          <Typography
            as="h1"
            className={styles.title}
            variant="experimentParticleDisplay"
          >
            A particle field that lives on the GPU.
          </Typography>
          <Typography
            as="p"
            variant="experimentParticleIntro"
            className={styles.intro}
          >
            Rust prepares one tiny frame command while a compute shader advances
            100,000 particles by default and can scale to 4.2 million. An
            instanced render pass draws them without reading their state back to
            JavaScript.
          </Typography>
        </header>
        <WasmCanvas />
        <aside
          className={typographyVariants({
            variant: "experimentNotes",
            className: styles.notes,
          })}
        >
          <p className={styles.note}>
            Move across the field to bend its flow. React owns the controls
            while Rust/WASM owns frame policy and WebGPU owns particle state,
            simulation, trails, and drawing. Browsers without WebGPU retain the
            original Rust and Canvas implementation.
          </p>
        </aside>
      </main>
    </PageTransition>
  );
}
