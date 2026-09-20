"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./colorful-svg-pattern.module.css";

// Ported from benschac-new/packages/ui/src/PostLayout.tsx.
export function ColorfulSVGPattern() {
  const svgRef = useRef<SVGSVGElement>(null);
  const id = useId();

  useEffect(() => {
    const svg = svgRef.current;
    const header = svg?.parentElement;
    const group = svg?.querySelector("g");
    if (!svg || !header || !group) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previousTime = 0;
    let pointer: { x: number; y: number } | null = null;
    let lines: {
      element: SVGLineElement;
      x: number;
      y: number;
      rotation: number;
      target: number;
    }[] = [];

    const animate = (time: number) => {
      frame = 0;
      const easing =
        1 - 0.9 ** (Math.min(time - previousTime, 64) / (1000 / 60));
      previousTime = time;
      let moving = false;
      for (const line of lines) {
        if (pointer) {
          const dx = pointer.x - line.x;
          const dy = pointer.y - line.y;
          if (Math.hypot(dx, dy) < 10) {
            line.target = (Math.atan2(dy, dx) * 180) / Math.PI;
          }
        }
        const difference = line.target - line.rotation;
        if (Math.abs(difference) < 0.01) continue;
        line.rotation += difference * easing;
        line.element.setAttribute(
          "transform",
          `rotate(${line.rotation} ${line.x} ${line.y})`,
        );
        moving = true;
      }
      if (moving) frame = requestAnimationFrame(animate);
    };

    const rebuild = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      pointer = null;
      const { width, height } = svg.getBoundingClientRect();
      if (!width || !height) return;
      const viewWidth = (width / height) * 100;
      svg.setAttribute("viewBox", `0 0 ${viewWidth} 100`);
      const columns = Math.ceil(60 * (width / height));
      const fragment = document.createDocumentFragment();
      lines = [];
      for (let x = 0; x < columns; x++) {
        for (let y = 0; y < 60; y++) {
          const centerX = ((x + 0.5) * viewWidth) / columns;
          const centerY = ((y + 0.5) * 100) / 60;
          const rotation = (x + y) % 2 === 0 ? 0 : 90;
          const element = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line",
          );
          element.setAttribute("x1", String(centerX - 1));
          element.setAttribute("x2", String(centerX + 1));
          element.setAttribute("y1", String(centerY));
          element.setAttribute("y2", String(centerY));
          element.setAttribute(
            "stroke",
            `hsla(${Math.floor(Math.random() * 360)}, ${70 + Math.floor(Math.random() * 30)}%, ${35 + Math.floor(Math.random() * 30)}%, 0.6)`,
          );
          element.setAttribute("stroke-width", "0.2");
          element.setAttribute(
            "transform",
            `rotate(${rotation} ${centerX} ${centerY})`,
          );
          fragment.append(element);
          lines.push({
            element,
            x: centerX,
            y: centerY,
            rotation,
            target: rotation,
          });
        }
      }
      group.replaceChildren(fragment);
    };

    const move = (event: PointerEvent) => {
      if (reducedMotion.matches || event.pointerType === "touch") return;
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      pointer = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      );
      if (!frame) {
        previousTime = performance.now();
        frame = requestAnimationFrame(animate);
      }
    };
    const leave = () => {
      pointer = null;
    };
    const stop = () => {
      pointer = null;
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const observer = new ResizeObserver(rebuild);
    observer.observe(svg);
    header.addEventListener("pointermove", move);
    header.addEventListener("pointerleave", leave);
    reducedMotion.addEventListener("change", stop);
    document.addEventListener("visibilitychange", stop);
    return () => {
      stop();
      observer.disconnect();
      header.removeEventListener("pointermove", move);
      header.removeEventListener("pointerleave", leave);
      reducedMotion.removeEventListener("change", stop);
      document.removeEventListener("visibilitychange", stop);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className={styles.pattern}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}-fade`}>
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-mask`}>
          <rect width="100%" height="100%" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <g mask={`url(#${id}-mask)`} />
    </svg>
  );
}
