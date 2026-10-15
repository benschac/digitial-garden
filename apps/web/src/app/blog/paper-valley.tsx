"use client";

import {
  useAnimationFrame,
  useDocumentEvent,
  useIntersectionObserver,
  useMediaQuery,
  useResizeObserver,
  useWindowEvent,
} from "@personal-site/react-hooks";
import { type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./paper-valley.module.css";

const assets = "/images/blog/paper-valley";
const layers = [
  { name: "paper", scroll: 0, x: 0, y: 0 },
  { name: "sun", scroll: 4, x: 3, y: 1.5 },
  { name: "mountains", scroll: 10, x: 5, y: 2 },
  { name: "clouds", scroll: 14, x: 9, y: 3 },
  { name: "corner-cream", scroll: 7, x: -6, y: 2 },
  { name: "corner-sage", scroll: 12, x: -11, y: 3 },
  { name: "middle", scroll: 22, x: 12, y: 6 },
  { name: "foreground", scroll: 48, x: 28, y: 12 },
] as const;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/** Atomically reveal decoded, registered layers over the still fallback. */
export function PaperValley({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const images = useRef<(HTMLImageElement | null)[]>([]);
  const motionScale = useRef(1);
  const pointer = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, time: 0 });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [fine, setFine] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const active = ready && !failed && !reduced;
  const running = active && visible && !hidden;

  const { requestFrame, cancelFrame } = useAnimationFrame((now) => {
    if (!running || !frame.current) return false;
    const scale = motionScale.current;
    const point = pointer.current;
    const blend =
      1 - Math.exp(-Math.min(64, now - (point.time || now - 16)) / 110);
    point.time = now;
    point.x += (point.targetX - point.x) * blend;
    point.y += (point.targetY - point.y) * blend;
    const moving =
      Math.abs(point.targetX - point.x) + Math.abs(point.targetY - point.y) >
      0.001;
    if (!moving) {
      point.x = point.targetX;
      point.y = point.targetY;
      point.time = 0;
    }
    layers.forEach((layer, index) => {
      const image = images.current[index];
      if (!image) return;
      const py = layer.name.startsWith("corner") ? -Math.abs(point.y) : point.y;
      const x = point.x * layer.x * scale;
      // CSS owns scroll translation; transform is only the eased pointer offset.
      const y = py * layer.y * scale;
      image.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.09)`;
    });
    return moving;
  });
  const requestRender = () => {
    if (running) requestFrame();
  };
  const resetPointer = () => {
    pointer.current.targetX = 0;
    pointer.current.targetY = 0;
    requestRender();
  };

  useMediaQuery("(prefers-reduced-motion: reduce)", setReduced);
  useMediaQuery("(hover: hover) and (pointer: fine)", setFine);
  useIntersectionObserver(frame, setVisible);
  useResizeObserver(frame, () => {
    if (!frame.current) return;
    const scale = Math.min(
      window.innerWidth <= 700 ? 0.5 : 1,
      frame.current.getBoundingClientRect().height / 860,
    );
    motionScale.current = scale;
    // Measure only on resize, never on scroll or in the pointer animation loop.
    layers.forEach((layer, index) => {
      images.current[index]?.style.setProperty(
        "--blog-valley-scroll-y",
        `${-layer.scroll * scale}px`,
      );
    });
    requestRender();
  });
  useWindowEvent("blur", resetPointer);
  useDocumentEvent("visibilitychange", () => setHidden(document.hidden));
  useEffect(() => {
    if (!running || !fine) {
      pointer.current = { x: 0, y: 0, targetX: 0, targetY: 0, time: 0 };
    }
    if (running) requestFrame();
    else cancelFrame();
    return cancelFrame;
  }, [running, fine, requestFrame, cancelFrame]);

  useEffect(() => {
    // decode() cannot be aborted; ignore completions after unmount/Strict Mode replay.
    let cancelled = false;
    Promise.all(images.current.map((image) => image?.decode()))
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header
      className={styles.hero}
      data-paper-valley
      onPointerMove={(event) => {
        if (
          !fine ||
          !running ||
          event.pointerType === "touch" ||
          !frame.current
        )
          return;
        const bounds = frame.current.getBoundingClientRect();
        pointer.current.targetX = clamp(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -1,
          1,
        );
        pointer.current.targetY = clamp(
          ((event.clientY - bounds.top) / bounds.height) * 2 - 1,
          -1,
          1,
        );
        requestFrame();
      }}
      onPointerLeave={resetPointer}
      onPointerCancel={resetPointer}
    >
      <div className={styles.editorial}>{children}</div>
      <div
        ref={frame}
        className={styles.frame}
        data-active={active}
        data-running={running}
        aria-hidden="true"
      >
        {/* biome-ignore lint/performance/noImgElement: Preoptimized full-canvas fallback must match the registered layers. */}
        <img
          className={styles.original}
          src={`${assets}/original.webp`}
          width={2528}
          height={1696}
          alt=""
          fetchPriority="high"
        />
        <div className={styles.layers}>
          {layers.map((layer, index) => (
            // biome-ignore lint/performance/noImgElement: Preserve supplied canvases and use native decode for atomic readiness.
            <img
              key={layer.name}
              ref={(image) => {
                images.current[index] = image;
              }}
              data-layer={layer.name}
              className={styles.layer}
              src={`${assets}/${layer.name}.webp`}
              width={2528}
              height={1696}
              alt=""
              onError={() => setFailed(true)}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
