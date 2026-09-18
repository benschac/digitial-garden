import Link from "next/link";
import styles from "./home.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <h1>Benjamin Schachter</h1>
      <p>A code garden for software, systems, and experiments.</p>
      <nav aria-label="Primary" className={styles.links}>
        <a href="https://www.youtube.com/watch?v=UIBd0D4ny78&t=26s">
          Watch my App.js Conf 2026 talk →
        </a>
        {process.env.NODE_ENV === "development" ? (
          <Link href="/s">Talk to the workbench analyst →</Link>
        ) : null}
        <Link href="/blog">Read the blog →</Link>
      </nav>
      <section
        aria-labelledby="playground-heading"
        className={styles.playground}
      >
        <h2 id="playground-heading">The playground</h2>
        <nav aria-label="The playground" className={styles.links}>
          <Link href="/experiments/wasm-canvas">
            Explore WebGPU particles →
          </Link>
          <Link href="/experiments/perlin-noise">Compare Perlin noise →</Link>
          <Link href="/experiments/vector-math">Play with vector math →</Link>
          <Link href="/experiments/forces">Explore forces →</Link>
        </nav>
      </section>
    </main>
  );
}
