import type { Metadata } from "next";
import Link from "next/link";
import { WasmCanvas } from "./wasm-canvas";
import styles from "./wasm-canvas.module.css";

export const metadata: Metadata = {
  title: "WebGPU Particle Field",
  description:
    "A WebGPU simulation that scales from 100,000 to 4.2 million particles.",
  alternates: { canonical: "/experiments/wasm-canvas" },
};

export default function WasmCanvasPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/">← Workbench</Link>
        <span>Experiment 001</span>
      </nav>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Rust/WASM · WebGPU · WGSL</p>
        <h1>A particle field that lives on the GPU.</h1>
        <p className={styles.intro}>
          Rust prepares one tiny frame command while a compute shader advances
          100,000 particles by default and can scale to 4.2 million. An
          instanced render pass draws them without reading their state back to
          JavaScript.
        </p>
      </header>
      <WasmCanvas />
      <aside className={styles.notes}>
        <p>
          Move across the field to bend its flow. React owns the controls while
          Rust/WASM owns frame policy and WebGPU owns particle state,
          simulation, trails, and drawing. Browsers without WebGPU retain the
          original Rust and Canvas implementation.
        </p>
      </aside>
    </main>
  );
}
