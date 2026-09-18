import type { Metadata } from "next";
import Link from "next/link";
import styles from "../home.module.css";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Interactive experiments with particles, noise, vectors, and forces.",
  alternates: { canonical: "/playground" },
};

export default function PlaygroundPage() {
  return (
    <main className={styles.page}>
      <h1>Playground</h1>
      <p>Experiments to explore and play with.</p>
      <nav aria-label="Playground" className={styles.links}>
        <Link href="/experiments/wasm-canvas">Explore WebGPU particles →</Link>
        <Link href="/experiments/perlin-noise">Compare Perlin noise →</Link>
        <Link href="/experiments/vector-math">Play with vector math →</Link>
        <Link href="/experiments/forces">Explore forces →</Link>
        <Link href="/">← Back home</Link>
      </nav>
    </main>
  );
}
