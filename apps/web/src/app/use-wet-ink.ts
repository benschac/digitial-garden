"use client";

import {
  useAbortableEffect,
  useAnimationFrame,
  useDocumentEvent,
  useMediaQuery,
  useResizeObserver,
  useWindowEvent,
} from "@personal-site/react-hooks";
import { useMotionValueEvent, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

import type { createWetInkRenderer } from "./wet-ink-renderer";

const interactionQuery =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)";

const spring = { bounce: 0, duration: 0.3 };
export const inkFadeOutMs = 500;

const loadWetInkRenderer = () => import("./wet-ink-renderer");

export const useWetInk = <T extends HTMLSpanElement>(
  fadeOutMs = inkFadeOutMs
) => {
  const ink = useRef<T>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const renderer =
    useRef<Awaited<ReturnType<typeof createWetInkRenderer>>>(null);

  const enabled = useRef(false);
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const lastExit = useRef(Number.NEGATIVE_INFINITY);
  const lightX = useSpring(0, spring);
  const lightY = useSpring(0, spring);
  const sheen = useSpring(0, { bounce: 0, duration: 0.45 });

  const { requestFrame, cancelFrame } = useAnimationFrame(() => {
    if (enabled.current && !document.hidden) {
      renderer.current?.render(lightX.get(), lightY.get(), sheen.get());
    }

    return false;
  });

  const paint = () => {
    if (renderer.current && enabled.current && !document.hidden) {
      requestFrame();
    }
  };

  useMotionValueEvent(sheen, "change", paint);

  useMotionValueEvent(lightX, "change", (value) => {
    ink.current?.style.setProperty("--ink-light-x", `${value}px`);
    paint();
  });
  useMotionValueEvent(lightY, "change", (value) => {
    ink.current?.style.setProperty("--ink-light-y", `${value}px`);
    paint();
  });

  const reset = () => {
    if (ink.current) {
      delete ink.current.dataset.inkActive;
    }

    lastExit.current = Number.NEGATIVE_INFINITY;
    lightX.stop();
    lightY.stop();
    sheen.jump(0);
    cancelFrame();
    renderer.current?.render(lightX.get(), lightY.get(), 0);
  };

  useMediaQuery(interactionQuery, (matches) => {
    enabled.current = matches;
    setInteractionEnabled(matches);

    if (!matches) {
      reset();
    }
  });
  useWindowEvent("blur", reset);
  useDocumentEvent("visibilitychange", () => {
    if (document.hidden) {
      reset();
    }
  });

  useEffect(
    () => () => {
      lightX.stop();
      lightY.stop();
      sheen.stop();
    },
    [lightX, lightY, sheen]
  );

  useResizeObserver(
    ink,
    () => {
      const instance = renderer.current;

      if (!instance) {
        return;
      }

      instance.resize();
      instance.render(
        lightX.get(),
        lightY.get(),
        enabled.current ? sheen.get() : 0
      );
    },
    interactionEnabled
  );

  useAbortableEffect((signal) => {
    const element = ink.current;
    const target = canvas.current;

    if (!element || !target || !navigator.gpu) {
      return;
    }

    let instance: Awaited<ReturnType<typeof createWetInkRenderer>> = null;

    const initialize = async () => {
      try {
        const { createWetInkRenderer: createRenderer } =
          await loadWetInkRenderer();

        if (signal.aborted) {
          return;
        }

        instance = await createRenderer(target, element, signal);

        if (signal.aborted) {
          instance?.destroy();

          return;
        }

        renderer.current = instance;
        instance?.render(lightX.get(), lightY.get(), sheen.get());
      } catch (error) {
        if (!signal.aborted) {
          console.warn("Wet ink unavailable; keeping static lettering.", error);
        }
      }
    };

    initialize();

    return () => {
      cancelFrame();
      renderer.current = null;
      instance?.destroy();
    };
  }, interactionEnabled);

  const moveInk = (event: PointerEvent<Element>) => {
    if (event.pointerType !== "mouse" || !enabled.current) {
      return;
    }

    const element = ink.current;

    if (!element) {
      return;
    }

    // Both the CSS glow and GPU mask use the painted element's origin.
    const bounds = element.getBoundingClientRect();
    const nextX = event.clientX - bounds.left;
    const paintedY = event.clientY - bounds.top;

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

    if (ink.current) {
      ink.current.dataset.inkActive = "true";
    }

    sheen.set(1);
  };

  const resetInk = () => {
    if (ink.current) {
      delete ink.current.dataset.inkActive;
    }

    lastExit.current = performance.now();
    sheen.set(0);
  };

  return {
    canvas,
    ink,
    pointerHandlers: {
      onPointerCancel: resetInk,
      onPointerEnter: moveInk,
      onPointerLeave: resetInk,
      onPointerMove: moveInk,
    },
  };
};
