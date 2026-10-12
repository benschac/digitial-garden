"use client";

import { useAbortController, useMediaQuery } from "@personal-site/react-hooks";
import { cn } from "@personal-site/ui/lib/utils";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./animated-diagram.module.css";

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
export function AnimatedDiagram({
  src,
  title,
  description,
  autoplay = false,
  className,
  theme,
}: AnimatedDiagramProps) {
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
    if (!container || reducedMotion !== false) return;
    const controller = createController();
    const { signal } = controller;
    let player: HTMLElement | undefined;
    let controlsObserver: MutationObserver | undefined;

    async function initialize() {
      setStatus("Loading interactive diagram…");
      try {
        if (!/^\/diagrams\/[a-z0-9-]+\.json$/.test(src)) {
          throw new Error("Use a repository-owned /diagrams/name.json file.");
        }
        const [module, response] = await Promise.all([
          import("giotto/player"),
          fetch(src, { signal }),
        ]);
        if (!response.ok) throw new Error(`Diagram HTTP ${response.status}`);
        const doc: unknown = await response.json();
        if (signal.aborted) return;
        if (
          !doc ||
          typeof doc !== "object" ||
          !("elements" in doc) ||
          !Array.isArray(doc.elements)
        ) {
          throw new Error("Invalid diagram document.");
        }
        const element = new module.GiottoPlayer();
        player = element;
        element.setAttribute("autoplay", String(autoplay));
        if (theme) element.setAttribute("theme", theme);
        element.setAttribute("aria-describedby", captionId);
        element.className = styles.player;
        element.figStyle = {
          font: "var(--font-ui, system-ui), sans-serif",
          shadow: false,
          radius: 6,
          dark: { packetText: "#23211e" },
        };
        // Load before connecting: malformed data never leaves an empty player behind.
        element.doc = doc;
        if (signal.aborted) return;
        container?.append(element);
        // Giotto rebuilds its native buttons on playback changes. Its exported
        // controls/steps parts have glyph labels; retain their descriptive titles
        // as accessible names. No shared hook owns shadow-root mutation observation.
        const root = element.shadowRoot;
        const labelControls = () => {
          for (const button of root?.querySelectorAll<HTMLButtonElement>(
            "button[title]",
          ) ?? []) {
            button.setAttribute("aria-label", button.title);
          }
        };
        labelControls();
        if (root) {
          controlsObserver = new MutationObserver(labelControls);
          for (const part of root.querySelectorAll('[part="controls"]')) {
            controlsObserver.observe(part, { childList: true });
          }
        }
        setStatus("");
      } catch {
        player?.remove();
        if (!signal.aborted)
          setStatus("Animation unavailable. Read the description below.");
      }
    }
    void initialize();
    return () => {
      controller.abort();
      controlsObserver?.disconnect();
      // disconnectedCallback releases Giotto's observers, listeners and animation frame.
      player?.remove();
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
        <p className={styles.status} role="status">
          {reducedMotion
            ? "Static description shown because reduced motion is enabled."
            : status}
        </p>
      ) : null}
      <figcaption className={styles.caption} id={captionId}>
        {description}
      </figcaption>
    </figure>
  );
}
