"use client";

import {
  useAnimationFrame,
  useDocumentEvent,
  useIntersectionObserver,
  useMediaQuery,
  useResizeObserver,
  useWindowEvent,
} from "@personal-site/react-hooks";
import { cn } from "@personal-site/ui/lib/utils";
import { useRef } from "react";

import { frameProgress } from "./svg-pattern-motion";

import styles from "./colorful-svg-pattern.module.css";

const COLORS = ["#cb6247", "#bd8540", "#72844b", "#4f8d86", "#7771a5"];
const POINTER_RADIUS = 170;
const RIPPLE_DURATION = 1400;

interface PatternLine {
  element: SVGLineElement;
  x: number;
  y: number;
  restingRotation: number;
  rotation: number;
  emphasis: number;
}

interface PatternSimulation {
  bounds: DOMRect | null;
  finePointer: boolean;
  lines: PatternLine[];
  pointer: { x: number; y: number } | null;
  previousTime: number | null;
  reducedMotion: boolean;
  ripples: { x: number; y: number; startedAt: number }[];
  visible: boolean;
}

const resetSimulation = (state: PatternSimulation) => {
  state.pointer = null;
  state.ripples = [];
  state.previousTime = null;

  for (const line of state.lines) {
    line.rotation = line.restingRotation;
    line.emphasis = 0;
    line.element.setAttribute(
      "transform",
      `translate(${line.x} ${line.y}) rotate(${line.rotation})`
    );
    line.element.style.opacity = "0.48";
  }
};

// A line has no direction: take the shortest turn, including across ±180°.
const angleDifference = (target: number, current: number) =>
  ((((target - current + 90) % 180) + 180) % 180) - 90;

export const ColorfulSVGPattern = ({ className }: { className?: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const simulation = useRef<PatternSimulation>({
    bounds: null,
    finePointer: false,
    lines: [],
    pointer: null,
    previousTime: null,
    reducedMotion: false,
    ripples: [],
    visible: true,
  });

  const { requestFrame, cancelFrame } = useAnimationFrame((time) => {
    const state = simulation.current;

    if (state.reducedMotion || !state.visible || document.hidden) {
      state.previousTime = null;

      return false;
    }

    const easing = frameProgress(state.previousTime, time);
    state.previousTime = time;
    state.ripples = state.ripples.filter(
      (ripple) => time - ripple.startedAt < RIPPLE_DURATION
    );
    let moving = state.ripples.length > 0;

    for (const line of state.lines) {
      let target = line.restingRotation;
      let emphasis = 0;

      if (state.pointer) {
        const dx = state.pointer.x - line.x;
        const dy = state.pointer.y - line.y;
        const influence = Math.max(0, 1 - Math.hypot(dx, dy) / POINTER_RADIUS);

        if (influence > 0) {
          target +=
            angleDifference((Math.atan2(dy, dx) * 180) / Math.PI, target) *
            influence;
        }

        emphasis = influence;
      }

      for (const ripple of state.ripples) {
        const age = Math.max(0, time - ripple.startedAt);
        const dx = line.x - ripple.x;
        const dy = line.y - ripple.y;

        const ring = Math.max(
          0,
          1 - Math.abs(Math.hypot(dx, dy) - age * 0.6) / 75
        );

        const influence = ring * (1 - age / RIPPLE_DURATION);

        if (influence > 0) {
          target +=
            angleDifference((Math.atan2(dy, dx) * 180) / Math.PI + 90, target) *
            influence;
        }

        emphasis = Math.max(emphasis, influence);
      }

      const difference = angleDifference(target, line.rotation);
      const emphasisDifference = emphasis - line.emphasis;

      const settled =
        Math.abs(difference) < 0.05 && Math.abs(emphasisDifference) < 0.002;

      if (settled && line.rotation === target && line.emphasis === emphasis) {
        continue;
      }

      line.rotation = settled ? target : line.rotation + difference * easing;
      line.emphasis = settled
        ? emphasis
        : line.emphasis + emphasisDifference * easing;
      line.element.setAttribute(
        "transform",
        `translate(${line.x} ${line.y}) rotate(${line.rotation}) scale(${1 + line.emphasis * 0.4})`
      );
      line.element.style.opacity = String(0.48 + line.emphasis * 0.52);

      if (!settled) {
        moving = true;
      }
    }

    if (!moving) {
      state.previousTime = null;
    }

    return moving;
  });

  const reset = () => {
    cancelFrame();
    resetSimulation(simulation.current);
  };

  useMediaQuery("(prefers-reduced-motion: reduce)", (matches) => {
    simulation.current.reducedMotion = matches;
    reset();
  });
  useMediaQuery("(hover: hover) and (pointer: fine)", (matches) => {
    simulation.current.finePointer = matches;
    reset();
  });
  useDocumentEvent("visibilitychange", reset);
  useWindowEvent("blur", reset);
  useIntersectionObserver(svgRef, (visible) => {
    simulation.current.visible = visible;

    if (!visible) {
      reset();
    }
  });

  useResizeObserver(svgRef, () => {
    const svg = svgRef.current;
    const group = svg?.querySelector("g");

    if (!svg || !group) {
      return;
    }

    reset();
    const bounds = svg.getBoundingClientRect();
    simulation.current.bounds = bounds;
    const { width, height } = bounds;

    if (!width || !height) {
      return;
    }

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    // Keep marks legible in pixels and cap the SVG work on very wide screens.
    const spacing = Math.max(18, Math.sqrt((width * height) / 3200));
    const fragment = document.createDocumentFragment();
    const lines: PatternLine[] = [];

    for (let column = 0; column < Math.ceil(width / spacing); column += 1) {
      for (let row = 0; row < Math.ceil(height / spacing); row += 1) {
        const x = (column + 0.5) * spacing;
        const y = (row + 0.5) * spacing;
        const rotation = (column + row) % 2 === 0 ? 0 : 90;

        const element = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );

        element.setAttribute("x1", "-5.5");
        element.setAttribute("x2", "5.5");
        element.setAttribute(
          "stroke",
          COLORS[(column * 7 + row * 3) % COLORS.length]
        );
        element.setAttribute("stroke-width", "1.6");
        element.setAttribute("stroke-linecap", "round");
        element.setAttribute(
          "transform",
          `translate(${x} ${y}) rotate(${rotation})`
        );
        element.style.opacity = "0.48";
        fragment.append(element);
        lines.push({
          element,
          emphasis: 0,
          restingRotation: rotation,
          rotation,
          x,
          y,
        });
      }
    }

    simulation.current.lines = lines;
    group.replaceChildren(fragment);
  });

  const pointInPattern = (event: PointerEvent) => {
    const svg = svgRef.current;

    if (!svg || !simulation.current.visible || document.hidden) {
      return null;
    }

    // Resize/scroll own measurement; pointer events never flush SVG layout.
    const { bounds } = simulation.current;

    if (!bounds) {
      return null;
    }

    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    return x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height
      ? { x, y }
      : null;
  };

  const start = () => {
    requestFrame();
  };

  useWindowEvent("pointermove", (event) => {
    const state = simulation.current;

    if (
      state.reducedMotion ||
      !state.finePointer ||
      event.pointerType === "touch"
    ) {
      return;
    }

    const previousPointer = state.pointer;
    state.pointer = pointInPattern(event);

    if (state.pointer || previousPointer) {
      start();
    }
  });
  useWindowEvent("pointerdown", (event) => {
    const state = simulation.current;

    if (state.reducedMotion || event.button !== 0) {
      return;
    }

    const point = pointInPattern(event);

    if (!point) {
      return;
    }

    state.ripples = [
      ...state.ripples.slice(-3),
      { ...point, startedAt: performance.now() },
    ];
    start();
  });
  useWindowEvent("pointerout", (event) => {
    if (event.relatedTarget !== null) {
      return;
    }

    simulation.current.pointer = null;

    if (!simulation.current.reducedMotion) {
      start();
    }
  });
  useWindowEvent("scroll", () => {
    simulation.current.pointer = null;
    simulation.current.bounds = svgRef.current?.getBoundingClientRect() ?? null;

    if (!simulation.current.reducedMotion) {
      start();
    }
  });

  return (
    <>
      <svg
        ref={svgRef}
        className={cn(styles.pattern, className)}
        aria-hidden="true"
        focusable="false"
      >
        <g />
      </svg>
      <p className={styles.hint}>
        <span className={styles.pointerHint}>
          Move your pointer · Click for a ripple
        </span>
        <span className={styles.touchHint}>Tap the header for a ripple</span>
      </p>
    </>
  );
};
