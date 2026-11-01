"use client";

import { useAbortController, useMediaQuery } from "@personal-site/react-hooks";
import { cn } from "@personal-site/ui/lib/utils";
import { useEffect, useId, useRef, useState } from "react";

import { mountAnimatedDiagram } from "./animated-diagram-lifecycle";

import styles from "./animated-diagram.module.css";

export { decodeDiagramDocument } from "./animated-diagram-lifecycle";

export interface AnimatedDiagramProps {
  /** Trusted, repository-owned Giotto JSON in public/diagrams. */
  src: string;
  title: string;
  description: string;
  autoplay?: boolean;
  className?: string;
  theme?: "light" | "dark";
}

/** Giotto owns playback; React owns loading, cancellation, and the static fallback. */
export const AnimatedDiagram = ({
  src,
  title,
  description,
  autoplay = false,
  className,
  theme,
}: AnimatedDiagramProps) => {
  const host = useRef<HTMLDivElement>(null);
  const captionId = useId();
  const createController = useAbortController();
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const [status, setStatus] = useState("Loading interactive diagram…");
  useMediaQuery("(prefers-reduced-motion: reduce)", setReducedMotion);

  // src/theme changes must restart initialization; useAbortableEffect deliberately
  // does not track callback dependencies. This shared controller cancels each run.
  useEffect(() => {
    const container = host.current;

    if (!container || reducedMotion !== false) {
      return;
    }

    const controller = createController();
    const { signal } = controller;

    const dispose = mountAnimatedDiagram({
      autoplay,
      captionId,
      container,
      onStatus: setStatus,
      playerClassName: styles.player,
      signal,
      src,
      theme,
    });

    return () => {
      controller.abort();
      dispose();
    };
  }, [src, autoplay, theme, reducedMotion, createController, captionId]);

  return (
    <figure
      className={cn(styles.figure, className)}
      data-mdx-interactive
      data-prose-exclude
      data-diagram-theme={theme}
    >
      <div className={styles.title}>{title}</div>
      <div ref={host} />
      {reducedMotion || status ? (
        <output className={cn(styles.status, "block")}>
          {reducedMotion
            ? "Static description shown because reduced motion is enabled."
            : status}
        </output>
      ) : null}
      <figcaption className={styles.caption} id={captionId}>
        {description}
      </figcaption>
    </figure>
  );
};
