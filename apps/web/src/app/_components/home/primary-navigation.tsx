"use client";

import {
  useDocumentEvent,
  useMediaQuery,
  useResizeObserver,
} from "@personal-site/react-hooks";
import { cn } from "@personal-site/ui/lib/utils";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

import styles from "./hero.module.css";

export const NavigationHighlight = ({
  children,
  rowClassName,
  className,
  highlightClassName,
  paddingX = 6,
  paddingY = 4,
}: {
  children: ReactNode;
  rowClassName: string;
  className?: string;
  highlightClassName?: string;
  paddingX?: number;
  paddingY?: number;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const canHover = useRef(false);
  const hoveredLink = useRef<HTMLAnchorElement | null>(null);

  const [highlight, setHighlight] = useState({
    clip: "inset(0 100% 0 0 round 4px)",
    color: "var(--color-ink)",
    moving: false,
    visible: false,
  });

  const hideHighlight = () => {
    hoveredLink.current = null;
    setHighlight((previous) => ({ ...previous, visible: false }));
  };

  useMediaQuery("(hover: hover) and (pointer: fine)", (matches) => {
    canHover.current = matches;

    if (!matches) {
      hideHighlight();
    }
  });
  useResizeObserver(rowRef, hideHighlight);
  useDocumentEvent("keydown", (event) => {
    if (event.key === "Tab" && hoveredLink.current) {
      hideHighlight();
    }
  });

  return (
    <div
      ref={rowRef}
      className={cn("relative", className)}
      onPointerOver={(event) => {
        if (!canHover.current || event.pointerType !== "mouse") {
          return;
        }

        const link = (event.target as Element).closest("a");
        const row = rowRef.current;

        if (!link || !row || link === hoveredLink.current) {
          return;
        }

        const bounds = row.getBoundingClientRect();
        const target = link.getBoundingClientRect();
        const moving = hoveredLink.current !== null;
        hoveredLink.current = link;
        setHighlight({
          clip: `inset(${target.top - bounds.top - paddingY}px ${bounds.right - target.right - paddingX}px ${bounds.bottom - target.bottom - paddingY}px ${target.left - bounds.left - paddingX}px round 4px)`,
          color: link.dataset.highlightColor ?? "var(--color-ink)",
          moving,
          visible: true,
        });
      }}
      onPointerLeave={hideHighlight}
    >
      <div className={rowClassName}>{children}</div>
      <div
        aria-hidden="true"
        inert
        className={cn(rowClassName, styles.highlight, highlightClassName)}
        data-moving={highlight.moving}
        style={{
          backgroundColor: highlight.color,
          clipPath: highlight.clip,
          opacity: highlight.visible ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const PrimaryNavigation = ({ children }: { children: ReactNode }) => (
  <nav
    aria-label="Primary"
    className={cn(
      "col-span-full m-0 py-6",
      "border-t border-[color-mix(in_srgb,currentColor_18%,transparent)]"
    )}
  >
    <NavigationHighlight
      className="-m-1.5"
      rowClassName="flex flex-wrap items-start gap-x-6 gap-y-2 p-1.5 sm:gap-x-8"
    >
      {children}
    </NavigationHighlight>
  </nav>
);
