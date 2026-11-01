"use client";

import {
  useIntersectionObserver,
  useMediaQuery,
  useWindowEvent,
} from "@personal-site/react-hooks";
import { spring } from "motion";
import { animate } from "motion/mini";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribeToVisibility = (listener: () => void) => {
  document.addEventListener("visibilitychange", listener);

  return () => document.removeEventListener("visibilitychange", listener);
};

export const useAvatarAnimation = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [finePointer, setFinePointer] = useState(false);
  const [visible, setVisible] = useState(false);

  const tabVisible = useSyncExternalStore(
    subscribeToVisibility,
    () => !document.hidden,
    () => true
  );

  const trackingRef = useRef<ReturnType<typeof animate>[]>([]);
  const enabled = visible && tabVisible && !reducedMotion;

  useMediaQuery("(prefers-reduced-motion: reduce)", setReducedMotion);
  useMediaQuery("(hover: hover) and (pointer: fine)", setFinePointer);
  useIntersectionObserver(stageRef, setVisible);

  const look = (x: number, y: number) => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    for (const animation of trackingRef.current) {
      animation.stop();
    }

    trackingRef.current = [];

    for (const part of stage.querySelectorAll<SVGGElement>(
      '[data-avatar-part^="eye-"], [data-avatar-part^="brow-"]'
    )) {
      const eye = part.dataset.avatarPart?.startsWith("eye-");
      trackingRef.current.push(
        animate(
          part,
          {
            // Native CSS translate preserves the footer's resting transform.
            translate: eye
              ? `${x * 5}px ${y * 3}px`
              : `${x * 1.5}px ${-Math.abs(x) * 1.5 + y}px`,
          },
          { bounce: 0.2, duration: 0.5, type: spring }
        )
      );
    }
  };

  useWindowEvent("pointermove", (event) => {
    if (!enabled || !finePointer || event.pointerType !== "mouse") {
      return;
    }

    const svg = stageRef.current?.querySelector("svg");
    const matrix = svg?.getScreenCTM();

    if (!matrix) {
      return;
    }

    // Map through the portrait's rotation and responsive size into SVG units.
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse()
    );

    look(
      Math.max(-1, Math.min(1, (point.x - 230) / 180)),
      Math.max(-1, Math.min(1, (point.y - 236) / 180))
    );
  });
  useWindowEvent("pointerout", (event) => {
    if (enabled && finePointer && !event.relatedTarget) {
      look(0, 0);
    }
  });
  useWindowEvent("blur", () => {
    if (enabled && finePointer) {
      look(0, 0);
    }
  });

  // The browser's animation API keeps blink scale separate from group tracking.
  // A cancellable timeout gives blinks natural pauses rather than a fixed loop.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    let blinks: Animation[] = [];

    const schedule = () => {
      timer = setTimeout(
        () => {
          blinks = Array.from(
            stageRef.current?.querySelectorAll<SVGPathElement>(
              '[data-avatar-part^="eye-"] > path'
            ) ?? [],
            (eye) =>
              eye.animate(
                [
                  { transform: "scaleY(1)" },
                  { offset: 0.45, transform: "scaleY(0.08)" },
                  { transform: "scaleY(1)" },
                ],
                {
                  duration: 180,
                  easing: "cubic-bezier(0.77, 0, 0.175, 1)",
                }
              )
          );
          schedule();
        },
        4000 + Math.random() * 3000
      );
    };

    schedule();

    return () => {
      clearTimeout(timer);

      for (const blink of blinks) {
        blink.cancel();
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !finePointer) {
      return;
    }

    const stage = stageRef.current;

    return () => {
      for (const animation of trackingRef.current) {
        animation.stop();
      }

      trackingRef.current = [];

      for (const part of stage?.querySelectorAll<SVGGElement>(
        '[data-avatar-part^="eye-"], [data-avatar-part^="brow-"]'
      ) ?? []) {
        part.style.removeProperty("translate");
      }
    };
  }, [enabled, finePointer]);

  return stageRef;
};
