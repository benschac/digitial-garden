"use client";

import { Heading } from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import { useMotionValueEvent, useSpring } from "motion/react";
import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useId,
  useRef,
} from "react";
import styles from "./ink-heading.module.css";
import type { createWetInkRenderer } from "./wet-ink-renderer";

const interactionQuery =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)";
const spring = { duration: 0.3, bounce: 0 };
const fadeOutMs = 500;

export function InkHeading({ className }: { className?: string }) {
  const impressionId = useId();
  const ink = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer =
    useRef<Awaited<ReturnType<typeof createWetInkRenderer>>>(null);
  const drawFrame = useRef(0);
  const enabled = useRef(false);
  const lastExit = useRef(Number.NEGATIVE_INFINITY);
  const lightX = useSpring(0, spring);
  const lightY = useSpring(0, spring);
  const sheen = useSpring(0, { duration: 0.45, bounce: 0 });
  const paint = () => {
    if (
      drawFrame.current ||
      !renderer.current ||
      !enabled.current ||
      document.hidden
    )
      return;
    drawFrame.current = requestAnimationFrame(() => {
      drawFrame.current = 0;
      renderer.current?.render(lightX.get(), lightY.get(), sheen.get());
    });
  };
  useMotionValueEvent(sheen, "change", paint);

  useMotionValueEvent(lightX, "change", (value) => {
    ink.current?.style.setProperty("--name-ink-x", `${value}px`);
    paint();
  });
  useMotionValueEvent(lightY, "change", (value) => {
    ink.current?.style.setProperty("--name-ink-y", `${value}px`);
    paint();
  });
  useEffect(() => {
    const media = window.matchMedia(interactionQuery);
    function reset() {
      if (ink.current) delete ink.current.dataset.inkActive;
      lastExit.current = Number.NEGATIVE_INFINITY;
      lightX.stop();
      lightY.stop();
      sheen.jump(0);
      renderer.current?.render(lightX.get(), lightY.get(), 0);
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
      lightX.stop();
      lightY.stop();
    };
  }, [lightX, lightY, sheen]);

  useEffect(() => {
    const element = ink.current;
    const target = canvas.current;
    if (!element || !target || !navigator.gpu) return;
    const controller = new AbortController();
    let instance: Awaited<ReturnType<typeof createWetInkRenderer>> = null;
    const resize = new ResizeObserver(() => {
      if (!instance) return;
      instance.resize();
      instance.render(
        lightX.get(),
        lightY.get(),
        enabled.current ? sheen.get() : 0,
      );
    });
    void import("./wet-ink-renderer")
      .then(async ({ createWetInkRenderer }) => {
        instance = await createWetInkRenderer(
          target,
          element,
          controller.signal,
        );
        if (controller.signal.aborted) {
          instance?.destroy();
          return;
        }
        renderer.current = instance;
        resize.observe(element);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          console.warn("Wet ink unavailable; keeping static lettering.", error);
      });
    return () => {
      controller.abort();
      resize.disconnect();
      cancelAnimationFrame(drawFrame.current);
      drawFrame.current = 0;
      renderer.current = null;
      instance?.destroy();
    };
  }, [lightX, lightY, sheen]);

  function moveInk(event: PointerEvent<HTMLHeadingElement>) {
    if (event.pointerType !== "mouse" || !enabled.current) return;

    // Use the heading bounds for stable pointer-relative lighting.
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX = event.clientX - bounds.left;
    const nextY = event.clientY - bounds.top;
    // Match the painted span's extra descender padding.
    const paintedY =
      nextY + parseFloat(getComputedStyle(event.currentTarget).fontSize) * 0.15;
    if (
      !ink.current?.dataset.inkActive &&
      performance.now() - lastExit.current > fadeOutMs
    ) {
      lightX.jump(nextX);
      lightY.jump(paintedY);
    } else {
      lightX.set(nextX);
      lightY.set(paintedY);
    }
    if (ink.current) ink.current.dataset.inkActive = "true";
    sheen.set(1);
  }

  function resetInk() {
    if (ink.current) delete ink.current.dataset.inkActive;
    lastExit.current = performance.now();
    sheen.set(0);
  }

  return (
    <Heading
      as="h1"
      variant="display"
      className={cn("relative", styles.hoverArea, className)}
      onPointerEnter={moveInk}
      onPointerMove={moveInk}
      onPointerLeave={resetInk}
      onPointerCancel={resetInk}
    >
      <svg
        className="absolute h-0 w-0 overflow-hidden"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter
            id={impressionId}
            x="-5%"
            y="-5%"
            width="110%"
            height="110%"
            colorInterpolationFilters="sRGB"
          >
            <feOffset in="SourceAlpha" dx="0.35" dy="1.4" result="lowered" />
            <feComposite
              in="SourceAlpha"
              in2="lowered"
              operator="out"
              result="innerEdge"
            />
            <feGaussianBlur
              in="innerEdge"
              stdDeviation="0.2"
              result="softEdge"
            />
            <feComposite
              in="softEdge"
              in2="SourceAlpha"
              operator="in"
              result="insetMask"
            />
            <feFlood floodColor="#080604" floodOpacity="1" result="shadow" />
            <feComposite
              in="shadow"
              in2="insetMask"
              operator="in"
              result="insetShadow"
            />
            <feOffset in="SourceAlpha" dx="-0.25" dy="-0.6" result="raised" />
            <feComposite
              in="SourceAlpha"
              in2="raised"
              operator="out"
              result="highlightEdge"
            />
            <feFlood floodColor="#f8f5ee" floodOpacity="0.24" result="light" />
            <feComposite
              in="light"
              in2="highlightEdge"
              operator="in"
              result="insetHighlight"
            />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="insetShadow" />
              <feMergeNode in="insetHighlight" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <span
        ref={ink}
        className={styles.ink}
        style={
          {
            "--name-ink-fade-out": `${fadeOutMs}ms`,
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
