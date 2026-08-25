import type { Metadata } from "next";
import Link from "next/link";
import styles from "../wasm-canvas/wasm-canvas.module.css";
import { TypeGpuParticles } from "./typegpu-particles";

export const metadata: Metadata = {
  title: "TypeGPU Particle Field",
  description:
    "A side-by-side TypeGPU port of the Rust/WASM WebGPU particle field.",
  alternates: { canonical: "/experiments/typegpu-particles" },
};

export default function TypeGpuParticlesPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/experiments/wasm-canvas">← Raw WebGPU</Link>
        <span>Experiment 001B</span>
      </nav>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Rust/WASM · TypeGPU · WGSL</p>
        <h1>The same field, through TypeGPU.</h1>
        <p className={styles.intro}>
          This is a behavioral copy of the raw WebGPU particle experiment. It
          keeps the same Rust frame protocol, GPU-resident state, controls, and
          Canvas fallback while TypeGPU owns the typed resource and layout
          layer.
        </p>
      </header>
      <TypeGpuParticles />
      <aside className={styles.notes}>
        <p>
          Use the raw WebGPU link above to compare the two implementations. Both
          versions run the same visual system; the difference is how the
          browser-side GPU resources and bindings are described and wired.
        </p>
      </aside>
    </main>
  );
}
