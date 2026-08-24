"use client";

import { useEffect, useId, useRef, useState } from "react";
import { frameDeltaSeconds } from "./animation-timing";
import type { ParticleRenderer } from "./particle-renderer";
import { useAnimationFrame } from "./use-animation-frame";
import { createWasmParticleRenderer } from "./wasm-particle-renderer";
import { createWebGpuParticleRenderer } from "./webgpu-particle-renderer";

const HEADER_PARTICLE_COUNT = 2_350_000;
const HEADER_GRAVITY = 0.85;
const HEADER_SIMULATION_SPEED = 3.2;
const GPU_PARTICLE_LIMIT = 4_200_000;
const GPU_PARTICLE_MINIMUM = 10_000;
const GPU_PARTICLE_STEP = 10_000;
const PARTICLE_NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

type HeaderControlStatus = "loading" | "ready" | "unavailable";

interface ParticleHeaderBackgroundProps {
  canvasClassName?: string;
  controlsClassName?: string;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function ParticleHeaderBackground({
  canvasClassName,
  controlsClassName,
}: ParticleHeaderBackgroundProps) {
  const particleInputId = useId();
  const gravityInputId = useId();
  const speedInputId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ParticleRenderer | null>(null);
  const densityRef = useRef(HEADER_PARTICLE_COUNT);
  const gravityRef = useRef(HEADER_GRAVITY);
  const isVisibleRef = useRef(true);
  const pointerRef = useRef({ active: false, x: 0, y: 0 });
  const reducedMotionRef = useRef(false);
  const renderStaticFrameRef = useRef<() => void>(() => undefined);
  const speedRef = useRef(HEADER_SIMULATION_SPEED);
  const previousFrameTimeRef = useRef<number | null>(null);
  const [density, setDensity] = useState(HEADER_PARTICLE_COUNT);
  const [gravity, setGravity] = useState(HEADER_GRAVITY);
  const [controlStatus, setControlStatus] =
    useState<HeaderControlStatus>("loading");
  const [particleLimit, setParticleLimit] = useState(GPU_PARTICLE_LIMIT);
  const [speed, setSpeed] = useState(HEADER_SIMULATION_SPEED);
  const { cancelFrame, requestFrame } = useAnimationFrame((milliseconds) => {
    const renderer = rendererRef.current;
    if (
      !renderer ||
      document.hidden ||
      !isVisibleRef.current ||
      reducedMotionRef.current
    ) {
      return false;
    }

    const deltaSeconds = frameDeltaSeconds(
      previousFrameTimeRef.current,
      milliseconds,
    );
    previousFrameTimeRef.current = milliseconds;
    renderer.render({
      deltaSeconds,
      elapsedSeconds: milliseconds / 1_000,
      interaction: gravityRef.current,
      pointerX: pointerRef.current.x,
      pointerY: pointerRef.current.y,
      simulationSpeed: speedRef.current,
    });

    return true;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const abortController = new AbortController();
    const canvasSize = { height: 1, pixelRatio: 1, width: 1 };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = reducedMotion.matches;

    const renderStaticFrame = () => {
      const renderer = rendererRef.current;
      if (!renderer) {
        return;
      }

      const milliseconds = performance.now();
      renderer.render({
        deltaSeconds: frameDeltaSeconds(null, milliseconds),
        elapsedSeconds: milliseconds / 1_000,
        interaction: gravityRef.current,
        pointerX: pointerRef.current.x,
        pointerY: pointerRef.current.y,
        simulationSpeed: speedRef.current,
      });
    };
    renderStaticFrameRef.current = renderStaticFrame;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      canvasSize.width = Math.max(bounds.width, 1);
      canvasSize.height = Math.max(bounds.height, 1);
      canvasSize.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      if (!pointerRef.current.active) {
        pointerRef.current.x = canvasSize.width / 2;
        pointerRef.current.y = canvasSize.height / 2;
      }
      rendererRef.current?.resize(
        canvasSize.width,
        canvasSize.height,
        canvasSize.pixelRatio,
      );

      if (reducedMotionRef.current) {
        renderStaticFrame();
      }
    };

    const resumeWhenEligible = () => {
      if (
        document.hidden ||
        !isVisibleRef.current ||
        reducedMotionRef.current
      ) {
        cancelFrame();
        return;
      }

      previousFrameTimeRef.current = null;
      requestFrame();
    };

    const handleVisibility = () => {
      resumeWhenEligible();
    };
    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const isInside =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;

      pointerRef.current.active = isInside;
      pointerRef.current.x = isInside
        ? event.clientX - bounds.left
        : canvasSize.width / 2;
      pointerRef.current.y = isInside
        ? event.clientY - bounds.top
        : canvasSize.height / 2;
    };
    const handleReducedMotion = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches;
      resumeWhenEligible();
    };
    const handleIntersection: IntersectionObserverCallback = (entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      isVisibleRef.current = entry.isIntersecting;
      resumeWhenEligible();
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    const intersectionObserver = new IntersectionObserver(handleIntersection);
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    reducedMotion.addEventListener("change", handleReducedMotion);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    resizeCanvas();

    const loadRenderer = async () => {
      let renderer: ParticleRenderer | null = null;

      try {
        renderer = await createWebGpuParticleRenderer(
          canvas,
          abortController.signal,
          HEADER_PARTICLE_COUNT,
          canvasSize.width,
          canvasSize.height,
          canvasSize.pixelRatio,
          () => {
            if (!abortController.signal.aborted) {
              cancelFrame();
              setControlStatus("unavailable");
            }
          },
        );
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        console.warn(
          "WebGPU header initialization failed; using WASM fallback.",
          error,
        );
      }

      if (!renderer && !abortController.signal.aborted) {
        try {
          renderer = await createWasmParticleRenderer(
            canvas,
            abortController.signal,
            HEADER_PARTICLE_COUNT,
            canvasSize.width,
            canvasSize.height,
            canvasSize.pixelRatio,
          );
        } catch (error) {
          if (!isAbortError(error)) {
            console.error("The particle header could not be loaded.", error);
            setControlStatus("unavailable");
          }
          return;
        }
      }

      if (!renderer || abortController.signal.aborted) {
        renderer?.destroy();
        return;
      }

      rendererRef.current = renderer;
      renderer.resize(
        canvasSize.width,
        canvasSize.height,
        canvasSize.pixelRatio,
      );
      const actualDensity = renderer.setParticleCount(densityRef.current);
      densityRef.current = actualDensity;
      setDensity(actualDensity);
      setParticleLimit(renderer.maxParticleCount);
      setControlStatus("ready");

      if (reducedMotionRef.current) {
        renderStaticFrame();
      } else {
        resumeWhenEligible();
      }
    };

    void loadRenderer();

    return () => {
      abortController.abort();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reducedMotion.removeEventListener("change", handleReducedMotion);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pointermove", handlePointerMove);
      cancelFrame();
      rendererRef.current?.destroy();
      rendererRef.current = null;
      renderStaticFrameRef.current = () => undefined;
    };
  }, [cancelFrame, requestFrame]);

  const renderReducedMotionFrame = () => {
    if (reducedMotionRef.current) {
      renderStaticFrameRef.current();
    }
  };

  const updateDensity = (value: number) => {
    const actualDensity = rendererRef.current?.setParticleCount(value) ?? value;
    densityRef.current = actualDensity;
    setDensity(actualDensity);
    renderReducedMotionFrame();
  };

  const updateGravity = (value: number) => {
    gravityRef.current = value;
    setGravity(value);
    renderReducedMotionFrame();
  };

  const updateSpeed = (value: number) => {
    speedRef.current = value;
    setSpeed(value);
    renderReducedMotionFrame();
  };

  const isReady = controlStatus === "ready";

  return (
    <>
      <canvas className={canvasClassName} ref={canvasRef} />
      <fieldset className={controlsClassName} disabled={!isReady}>
        <legend>Field controls</legend>
        <label htmlFor={particleInputId}>
          <span>Particles</span>
          <output htmlFor={particleInputId}>
            {PARTICLE_NUMBER_FORMATTER.format(density)}
          </output>
          <input
            aria-valuetext={PARTICLE_NUMBER_FORMATTER.format(density)}
            id={particleInputId}
            max={particleLimit}
            min={particleLimit > 2_400 ? GPU_PARTICLE_MINIMUM : 200}
            onChange={(event) =>
              updateDensity(Number(event.currentTarget.value))
            }
            step={particleLimit > 2_400 ? GPU_PARTICLE_STEP : 50}
            type="range"
            value={density}
          />
        </label>
        <label htmlFor={gravityInputId}>
          <span>Gravity</span>
          <output htmlFor={gravityInputId}>{Math.round(gravity * 100)}%</output>
          <input
            aria-valuetext={`${Math.round(gravity * 100)}%`}
            id={gravityInputId}
            max="1.8"
            min="-1.2"
            onChange={(event) =>
              updateGravity(Number(event.currentTarget.value))
            }
            step="0.05"
            type="range"
            value={gravity}
          />
        </label>
        <label htmlFor={speedInputId}>
          <span>Speed</span>
          <output htmlFor={speedInputId}>{speed.toFixed(1)}×</output>
          <input
            aria-valuetext={`${speed.toFixed(1)} times`}
            id={speedInputId}
            max="8"
            min="0.5"
            onChange={(event) => updateSpeed(Number(event.currentTarget.value))}
            step="0.1"
            type="range"
            value={speed}
          />
        </label>
        <span aria-live="polite" data-particle-status>
          {controlStatus === "ready"
            ? "Controls ready"
            : controlStatus === "unavailable"
              ? "Controls unavailable"
              : "Loading field…"}
        </span>
      </fieldset>
    </>
  );
}
