"use client";

import { useMotionValueEvent, useSpring } from "motion/react";
import { type PointerEvent, useEffect, useRef } from "react";
import styles from "./ink-heading.module.css";

const interactionQuery =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)";
const spring = { duration: 0.3, bounce: 0 };
const fadeOutMs = 260;

export function InkHeading() {
  const ink = useRef<HTMLSpanElement>(null);
  const enabled = useRef(false);
  const lastExit = useRef(Number.NEGATIVE_INFINITY);
  const x = useSpring(0, spring);
  const y = useSpring(0, spring);

  useMotionValueEvent(x, "change", (value) => {
    ink.current?.style.setProperty("--name-ink-x", `${value}px`);
  });
  useMotionValueEvent(y, "change", (value) => {
    ink.current?.style.setProperty("--name-ink-y", `${value}px`);
  });

  useEffect(() => {
    const media = window.matchMedia(interactionQuery);
    function reset() {
      if (ink.current) delete ink.current.dataset.inkActive;
      x.stop();
      y.stop();
      lastExit.current = Number.NEGATIVE_INFINITY;
    }
    function updatePreference() {
      enabled.current = media.matches;
      if (!media.matches) reset();
    }
    updatePreference();
    media.addEventListener("change", updatePreference);
    window.addEventListener("blur", reset);
    return () => {
      media.removeEventListener("change", updatePreference);
      window.removeEventListener("blur", reset);
      x.stop();
      y.stop();
    };
  }, [x, y]);

  function moveInk(event: PointerEvent<HTMLSpanElement>) {
    if (event.pointerType !== "mouse" || !enabled.current) return;

    const element = event.currentTarget;
    const bounds = element.getBoundingClientRect();
    const nextX = event.clientX - bounds.left;
    const nextY = event.clientY - bounds.top;

    // Start at the entry point once invisible; preserve momentum on quick re-entry.
    if (
      !element.dataset.inkActive &&
      performance.now() - lastExit.current > fadeOutMs
    ) {
      x.jump(nextX);
      y.jump(nextY);
    } else {
      x.set(nextX);
      y.set(nextY);
    }
    element.dataset.inkActive = "true";
  }

  function resetInk(event: PointerEvent<HTMLSpanElement>) {
    delete event.currentTarget.dataset.inkActive;
    lastExit.current = performance.now();
  }

  return (
    <h1>
      <span
        ref={ink}
        className={styles.ink}
        onPointerEnter={moveInk}
        onPointerMove={moveInk}
        onPointerLeave={resetInk}
        onPointerCancel={resetInk}
      >
        Benjamin Schachter
      </span>
    </h1>
  );
}
