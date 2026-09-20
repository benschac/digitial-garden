import { Eyebrow } from "@personal-site/ui/components/eyebrow";
import { PageNavigation } from "@personal-site/ui/components/page-navigation";
import {
  Typography,
  typographyVariants,
} from "@personal-site/ui/components/typography";
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
      <main
        className={typographyVariants({
          variant: "experimentPage",
          className: styles.page,
        })}
      >
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
          <Typography as="h1" variant="experimentDisplay">
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
