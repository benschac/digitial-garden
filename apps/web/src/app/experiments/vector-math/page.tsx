import { Eyebrow } from "@personal-site/ui/components/eyebrow";
import { PageNavigation } from "@personal-site/ui/components/page-navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/app/_components/page-transition";
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
    <PageTransition>
      <main className={styles.page}>
        <PageNavigation className={styles.nav}>
          <Link href="/" transitionTypes={["nav-back"]}>
            ← Workbench
          </Link>
          <span>Experiment 003</span>
        </PageNavigation>

        <header className={styles.header}>
          <Eyebrow className={styles.eyebrow}>
            Pts.js · Linear algebra · Canvas
          </Eyebrow>
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
            The canvas is an XY projection; the controls and readout retain Z
            for the 3D methods. Pts.js supplies the points, canvas space, and
            drawing forms while the tested math layer computes every result.
          </p>
        </aside>
      </main>
    </PageTransition>
  );
}
