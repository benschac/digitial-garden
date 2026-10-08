"use client";

import { cn } from "@personal-site/ui/lib/utils";
import { type CSSProperties, useId } from "react";
import { inkGrainTexture } from "../../ink-grain";
import inkStyles from "../../ink-heading.module.css";
import { InkImpressionFilter } from "../../ink-impression-filter";
import { useWetInk } from "../../use-wet-ink";
import styles from "./home-footer.module.css";

export function HomeFooter() {
  const impressionId = useId();
  const { ink, canvas, pointerHandlers } = useWetInk<HTMLSpanElement>(900);
  return (
    <footer
      className={cn("mt-[clamp(5rem,10vw,10rem)] text-ink", styles.footer)}
      translate="no"
    >
      <div className="mx-auto max-w-[80rem] px-[clamp(1.5rem,4vw,3rem)]">
        <div className={styles.wordmark}>
          <div
            className={cn(inkStyles.hoverArea, styles.hoverArea)}
            {...pointerHandlers}
          >
            <span
              ref={ink}
              className={cn(inkStyles.ink, styles.lettering)}
              style={
                {
                  "--ink-grain": `url("${inkGrainTexture}")`,
                  "--name-letterpress-filter": `url(#${impressionId})`,
                } as CSSProperties
              }
            >
              @benschac
              <canvas
                ref={canvas}
                className={inkStyles.sheen}
                aria-hidden="true"
                tabIndex={-1}
              />
              <svg
                className="absolute h-0 w-0 overflow-hidden"
                aria-hidden="true"
                focusable="false"
              >
                <defs>
                  <InkImpressionFilter id={impressionId} />
                </defs>
              </svg>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
