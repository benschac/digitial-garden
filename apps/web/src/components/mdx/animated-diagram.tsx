"use client";

import { useAbortController, useMediaQuery } from "@personal-site/react-hooks";
import { cn } from "@personal-site/ui/lib/utils";
import { Schema } from "effect";
import { useEffect, useId, useRef, useState } from "react";

import { articleCodeTheme } from "./article-code-theme";

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

const diagramDocumentSchema = Schema.StructWithRest(
  Schema.Struct({ elements: Schema.Array(Schema.Unknown) }),
  [Schema.Record(Schema.String, Schema.Unknown)]
);

export const decodeDiagramDocument = Schema.decodeUnknownSync(
  diagramDocumentSchema
);

interface DiagramMount {
  autoplay: boolean;
  captionId: string;
  container: HTMLDivElement;
  onStatus: (status: string) => void;
  signal: AbortSignal;
  src: string;
  theme: AnimatedDiagramProps["theme"];
}

const mountAnimatedDiagram = ({
  autoplay,
  captionId,
  container,
  onStatus,
  signal,
  src,
  theme,
}: DiagramMount) => {
  let player: HTMLElement | undefined;
  let controlsObserver: MutationObserver | undefined;
  let stopHighlighting: (() => void) | undefined;

  const initialize = async () => {
    onStatus("Loading interactive diagram…");

    try {
      if (!/^\/diagrams\/[a-z0-9-]+\.json$/u.test(src)) {
        throw new Error("Use a repository-owned /diagrams/name.json file.");
      }

      const [module, response] = await Promise.all([
        import("giotto/player"),
        fetch(src, { signal }),
      ]);

      if (!response.ok) {
        throw new Error(`Diagram HTTP ${response.status}`);
      }

      const doc = decodeDiagramDocument(await response.json());

      if (signal.aborted) {
        return;
      }

      const element = new module.GiottoPlayer();
      player = element;
      element.setAttribute("autoplay", String(autoplay));

      if (theme) {
        element.setAttribute("theme", theme);
      }

      element.setAttribute("aria-describedby", captionId);
      element.className = styles.player;
      element.figStyle = {
        codeFill: articleCodeTheme.background,
        codeText: articleCodeTheme.foreground,
        dark: {
          codeFill: articleCodeTheme.background,
          codeText: articleCodeTheme.foreground,
          packetText: "#202d27",
        },
        font: "var(--font-ui, system-ui), sans-serif",
        radius: 3,
        shadow: false,
      };
      // Load before connecting: malformed data never leaves an empty player behind.
      element.doc = doc;

      if (signal.aborted) {
        return;
      }

      container?.append(element);
      // Giotto rebuilds its native buttons on playback changes. Its exported
      // controls/steps parts have glyph labels; retain their descriptive titles
      // as accessible names. No shared hook owns shadow-root mutation observation.
      const root = element.shadowRoot;

      const labelControls = () => {
        for (const button of root?.querySelectorAll<HTMLButtonElement>(
          "button[title]"
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

      onStatus("");

      if (JSON.stringify(doc).includes('"type":"code"')) {
        // Highlighting is optional: a failed import leaves readable plain code.
        try {
          const { getArticleCodeTokenizer, highlightDiagramCode } =
            await import("./article-code-theme");

          const tokenize = await getArticleCodeTokenizer();

          if (signal.aborted) {
            return;
          }

          const svg = root?.querySelector("svg");

          if (svg) {
            stopHighlighting = highlightDiagramCode(svg, tokenize);
          }
        } catch {
          // Keep Giotto's code text and the shared dark palette as a fallback.
        }
      }
    } catch {
      player?.remove();

      if (!signal.aborted) {
        onStatus("Animation unavailable. Read the description below.");
      }
    }
  };

  void initialize();

  return () => {
    controlsObserver?.disconnect();
    stopHighlighting?.();
    player?.remove();
  };
};

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
