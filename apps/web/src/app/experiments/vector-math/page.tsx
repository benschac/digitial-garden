import { Eyebrow } from "@personal-site/ui/components/eyebrow";
import { PageNavigation } from "@personal-site/ui/components/page-navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/app/_components/page-transition";
import { Typography, typographyVariants } from "@/components/page-typography";
import styles from "./vector-math-styles";
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
      <main
        className={typographyVariants({
          variant: "experimentPage",
          className: styles.page,
        })}
      >
        <PageNavigation className={styles.nav}>
          <Link
            className={styles.navLink}
            href="/"
            transitionTypes={["nav-back"]}
          >
            ← Workbench
          </Link>
          <span>Experiment 003</span>
        </PageNavigation>

        <header className={styles.header}>
          <Eyebrow className={`mb-4 ${styles.eyebrow}`}>
            Pts.js · Linear algebra · Canvas
          </Eyebrow>
          <Typography
            as="h1"
            className={styles.title}
            variant="experimentDisplay"
          >
            Vectors, made tangible.
          </Typography>
          <Typography
            as="p"
            variant="experimentVectorIntro"
            className={styles.intro}
          >
            Drag the arrowheads, choose a method, and tune its inputs. The
            diagram, formula, and result stay in step, so every gesture has a
            numerical explanation.
          </Typography>
        </header>

        <VectorPlayground />

        <aside
          className={typographyVariants({
            variant: "experimentNotes",
            className: styles.notes,
          })}
        >
          <p className={styles.note}>
            The canvas is an XY projection; the controls and readout retain Z
            for the 3D methods. Pts.js supplies the points, canvas space, and
            drawing forms while the tested math layer computes every result.
          </p>
        </aside>
      </main>
    </PageTransition>
  );
}
