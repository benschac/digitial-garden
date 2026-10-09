"use client";

import { cn } from "@personal-site/ui/lib/utils";
import { type CSSProperties, useId } from "react";
import { inkGrainTexture } from "../../ink-grain";
import inkStyles from "../../ink-heading.module.css";
import { InkImpressionFilter } from "../../ink-impression-filter";
import { useWetInk } from "../../use-wet-ink";
import { FooterAvatar } from "./footer-avatar";
import styles from "./home-footer.module.css";

export function HomeFooter() {
  const impressionId = useId();
  const { ink, canvas, pointerHandlers } = useWetInk<HTMLSpanElement>(900);
  return (
    <footer className="mt-[clamp(2rem,4vw,4rem)] text-ink" translate="no">
      <div className="mx-auto max-w-[80rem] px-[clamp(1.5rem,4vw,3rem)]">
        <div className={styles.wordmark}>
          <FooterAvatar />
          <div
            className={cn(inkStyles.hoverArea, styles.hoverArea)}
            {...pointerHandlers}
          >
            <span
              aria-hidden="true"
              className={cn(styles.lettering, styles.knockout)}
            >
              @benschac
            </span>

            <span
              ref={ink}
              className={cn(inkStyles.ink, styles.lettering, styles.impression)}
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
