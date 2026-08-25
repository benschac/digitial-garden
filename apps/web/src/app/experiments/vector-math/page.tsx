import type { Metadata } from "next";
import Link from "next/link";
import styles from "./vector-math.module.css";
import { VectorPlayground } from "./vector-playground";

export const metadata: Metadata = {
  title: "Vector Math Playground",
  description:
    "An interactive Pts.js atlas for exploring the complete p5.Vector method set in two and three dimensions.",
  alternates: { canonical: "/experiments/vector-math" },
};

export default function VectorMathPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/">← Workbench</Link>
        <span>Experiment 003</span>
      </nav>

      <header className={styles.header}>
        <p className={styles.eyebrow}>Pts.js · Linear algebra · Canvas</p>
        <h1>Vectors, made tangible.</h1>
        <p className={styles.intro}>
          Drag the arrowheads, choose a method, and tune its inputs. The
          diagram, formula, and result stay in step, so every gesture has a
          numerical explanation.
        </p>
      </header>

      <VectorPlayground />

      <aside className={styles.notes}>
        <p>
          The canvas is an XY projection; the controls and readout retain Z for
          the 3D methods. Pts.js supplies the points, canvas space, and drawing
          forms while the tested math layer computes every result.
        </p>
      </aside>
    </main>
  );
}
