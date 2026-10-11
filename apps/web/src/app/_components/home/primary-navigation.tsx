"use client";

import {
  useDocumentEvent,
  useMediaQuery,
  useResizeObserver,
} from "@personal-site/react-hooks";
import { cn } from "@personal-site/ui/lib/utils";
import { type ReactNode, useRef, useState } from "react";
import styles from "./hero.module.css";

const rowClass = "flex flex-wrap items-start gap-x-6 gap-y-2 p-1.5 sm:gap-x-8";

export function PrimaryNavigation({ children }: { children: ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const canHover = useRef(false);
  const hoveredLink = useRef<HTMLAnchorElement | null>(null);
  const [highlight, setHighlight] = useState({
    clip: "inset(0 100% 0 0 round 4px)",
    visible: false,
    moving: false,
  });

  function hideHighlight() {
    hoveredLink.current = null;
    setHighlight((previous) => ({ ...previous, visible: false }));
  }

  useMediaQuery("(hover: hover) and (pointer: fine)", (matches) => {
    canHover.current = matches;
    if (!matches) hideHighlight();
  });
  useResizeObserver(rowRef, hideHighlight);
  useDocumentEvent("keydown", (event) => {
    if (event.key === "Tab" && hoveredLink.current) hideHighlight();
  });

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "col-span-full m-0 py-6",
        "border-t border-[color-mix(in_srgb,currentColor_18%,transparent)]",
      )}
    >
      <div
        ref={rowRef}
        className="relative -m-1.5"
        onPointerOver={(event) => {
          if (!canHover.current || event.pointerType !== "mouse") return;
          const link = (event.target as Element).closest("a");
          const row = rowRef.current;
          if (!link || !row || link === hoveredLink.current) return;
          const bounds = row.getBoundingClientRect();
          const target = link.getBoundingClientRect();
          const moving = hoveredLink.current !== null;
          hoveredLink.current = link;
          setHighlight({
            clip: `inset(${target.top - bounds.top - 4}px ${bounds.right - target.right - 6}px ${bounds.bottom - target.bottom - 4}px ${target.left - bounds.left - 6}px round 4px)`,
            visible: true,
            moving,
          });
        }}
        onPointerLeave={hideHighlight}
      >
        <div className={rowClass}>{children}</div>
        <div
          aria-hidden="true"
          inert
          className={cn(rowClass, styles.highlight)}
          data-moving={highlight.moving}
          style={{
            clipPath: highlight.clip,
            opacity: highlight.visible ? 1 : 0,
          }}
        >
          {children}
        </div>
      </div>
    </nav>
  );
}
