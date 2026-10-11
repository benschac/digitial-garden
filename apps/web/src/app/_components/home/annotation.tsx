"use client";

import { useIntersectionObserver } from "@personal-site/react-hooks";
import { type ReactNode, useRef, useState } from "react";
import styles from "./annotation.module.css";

// A fixed pen stroke: one loop that overshoots its start, as a hand would. Static
// geometry keeps server and client markup identical.
const circleStroke =
  "M 9 15 C 20 4 68 0 92 8 C 101 12 100 29 85 35 C 63 42 22 41 7 32 C -2 26 3 12 21 6 C 32 3 45 2 57 3";

/**
 * A pen mark drawn once when the phrase first scrolls into view. The mark is
 * absolutely positioned or painted as a background, so it never shifts layout.
 */
export function Annotation({
  kind,
  children,
}: {
  kind: "circle" | "highlight";
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [drawn, setDrawn] = useState(false);
  useIntersectionObserver(ref, (isIntersecting) => {
    if (isIntersecting) setDrawn(true);
  });

  return (
    <span ref={ref} className={styles[kind]} data-drawn={drawn}>
      {children}
      {kind === "circle" ? (
        <svg
          aria-hidden="true"
          focusable="false"
          className={styles.circleMark}
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
        >
          <path
            className={styles.circleStroke}
            d={circleStroke}
            pathLength={1}
          />
        </svg>
      ) : null}
    </span>
  );
}
