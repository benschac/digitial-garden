"use client";

import { Heading } from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import { type CSSProperties, useId } from "react";
import { inkGrainTexture } from "./ink-grain";
import styles from "./ink-heading.module.css";
import { InkImpressionFilter } from "./ink-impression-filter";
import { inkFadeOutMs, useWetInk } from "./use-wet-ink";

export function InkHeading({ className }: { className?: string }) {
  const impressionId = useId();
  const { ink, canvas, pointerHandlers } = useWetInk<HTMLSpanElement>();

  return (
    <Heading
      as="h1"
      variant="display"
      className={cn("relative", styles.hoverArea, className)}
      {...pointerHandlers}
    >
      <svg
        className="absolute h-0 w-0 overflow-hidden"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <InkImpressionFilter id={impressionId} />
        </defs>
      </svg>
      <span
        ref={ink}
        className={styles.ink}
        style={
          {
            "--ink-grain": `url("${inkGrainTexture}")`,
            "--name-ink-fade-out": `${inkFadeOutMs}ms`,
            "--name-letterpress-filter": `url(#${impressionId})`,
          } as CSSProperties
        }
      >
        Benjamin Schachter
        <canvas
          ref={canvas}
          className={styles.sheen}
          aria-hidden="true"
          tabIndex={-1}
        />
      </span>
    </Heading>
  );
}
