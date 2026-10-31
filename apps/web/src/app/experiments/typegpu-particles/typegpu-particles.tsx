"use client";

import {
  useAbortableEffect,
  useAnimationFrame,
  useMediaQuery,
} from "@personal-site/react-hooks";
import { useRef, useState } from "react";

import { typographyVariants } from "@/components/page-typography";

import { frameDeltaSeconds } from "../wasm-canvas/animation-timing";
import { createParticleLifecycle } from "../wasm-canvas/particle-lifecycle";
import type { ParticleLifecycle } from "../wasm-canvas/particle-lifecycle";
import styles from "../wasm-canvas/wasm-canvas-styles";
import { createWasmParticleRenderer } from "../wasm-canvas/wasm-particle-renderer";
import { createTypeGpuParticleRenderer } from "./typegpu-particle-renderer";

const DEFAULT_PARTICLE_COUNT = 100_000;
const DEFAULT_SIMULATION_SPEED = 2.5;
const GPU_PARTICLE_LIMIT = 32_000_000;
const GPU_PARTICLE_MINIMUM = 10_000;
const GPU_PARTICLE_STEP = 10_000;

export function TypeGpuParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lifecycleRef = useRef<ParticleLifecycle | null>(null);
  const fpsRef = useRef<HTMLOutputElement>(null);
  const densityRef = useRef(DEFAULT_PARTICLE_COUNT);
  const intensityRef = useRef(0.85);
  const speedRef = useRef(DEFAULT_SIMULATION_SPEED);
  const pausedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const pointerRef = useRef({ active: false, x: 0, y: 0 });
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef<number | null>(null);
  const previousFrameTimeRef = useRef<number | null>(null);
  const [density, setDensity] = useState(DEFAULT_PARTICLE_COUNT);
  const [intensity, setIntensity] = useState(0.85);
  const [particleLimit, setParticleLimit] = useState(GPU_PARTICLE_LIMIT);
  const [speed, setSpeed] = useState(DEFAULT_SIMULATION_SPEED);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState("Checking for WebGPU…");
  const { cancelFrame, requestFrame } = useAnimationFrame((milliseconds) => {
    const renderer = lifecycleRef.current;
    if (!renderer?.canAnimate()) {
      return false;
    }

    const deltaSeconds = frameDeltaSeconds(
      previousFrameTimeRef.current,
      milliseconds
    );
    previousFrameTimeRef.current = milliseconds;
    renderer.render({
      deltaSeconds,
      elapsedSeconds: milliseconds / 1_000,
      interaction: intensityRef.current,
      pointerX: pointerRef.current.active ? pointerRef.current.x : -10_000,
      pointerY: pointerRef.current.active ? pointerRef.current.y : -10_000,
      simulationSpeed: speedRef.current,
    });
    frameCountRef.current += 1;

    if (
      lastFpsUpdateRef.current !== null &&
      milliseconds - lastFpsUpdateRef.current >= 500
    ) {
      const framesPerSecond = Math.round(
        (frameCountRef.current * 1_000) /
          (milliseconds - lastFpsUpdateRef.current)
      );
      if (fpsRef.current) {
        fpsRef.current.value = `${framesPerSecond} fps`;
      }
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = milliseconds;
    }

    return true;
  });

  useMediaQuery("(prefers-reduced-motion: reduce)", (matches) => {
    reducedMotionRef.current = matches;
    lifecycleRef.current?.setEligibility({ reducedMotion: matches });
  });

  useAbortableEffect((signal) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const canvasSize = { height: 1, pixelRatio: 1, width: 1 };
    pointerRef.current = { active: false, x: 0, y: 0 };
    frameCountRef.current = 0;
    lastFpsUpdateRef.current = performance.now();
    previousFrameTimeRef.current = null;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      canvasSize.width = Math.max(bounds.width, 1);
      canvasSize.height = Math.max(bounds.height, 1);
      canvasSize.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      lifecycleRef.current?.resize(
        canvasSize.width,
        canvasSize.height,
        canvasSize.pixelRatio
      );
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    resizeCanvas();

    const updatePointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerRef.current.x = event.clientX - bounds.left;
      pointerRef.current.y = event.clientY - bounds.top;
      pointerRef.current.active = true;
    };
    const clearPointer = () => {
      pointerRef.current.active = false;
    };
    const handleVisibility = () => {
      lifecycleRef.current?.setEligibility({ hidden: document.hidden });
    };

    canvas.addEventListener("pointermove", updatePointer);
    canvas.addEventListener("pointerleave", clearPointer);
    document.addEventListener("visibilitychange", handleVisibility);

    if (reducedMotionRef.current) {
      pausedRef.current = true;
      setPaused(true);
    }

    let readyStatus = "";
    const lifecycle = createParticleLifecycle({
      signal,
      eligibility: {
        hidden: document.hidden,
        paused: pausedRef.current,
        reducedMotion: reducedMotionRef.current,
      },
      createGpu: (rendererSignal, lost) =>
        createTypeGpuParticleRenderer(
          canvas,
          rendererSignal,
          densityRef.current,
          canvasSize.width,
          canvasSize.height,
          canvasSize.pixelRatio,
          lost
        ),
      createFallback: (rendererSignal) =>
        createWasmParticleRenderer(
          canvas,
          rendererSignal,
          densityRef.current,
          canvasSize.width,
          canvasSize.height,
          canvasSize.pixelRatio
        ),
      configure: (renderer, rendererSignal) => {
        renderer.resize(
          canvasSize.width,
          canvasSize.height,
          canvasSize.pixelRatio
        );
        rendererSignal.throwIfAborted();
        const actualDensity = renderer.setParticleCount(densityRef.current);
        densityRef.current = actualDensity;
        setDensity(actualDensity);
        setParticleLimit(renderer.maxParticleCount);
        readyStatus =
          renderer.kind === "Rust/WASM + WebGPU"
            ? "Rust/WASM control + TypeGPU compute online"
            : "Rust/WASM fallback online";
      },
      onGpuFailure: (error) =>
        console.warn(
          "TypeGPU initialization failed; using WASM fallback.",
          error
        ),
      onState: (state, detail) => {
        if (state === "ready") {
          setStatus(readyStatus);
        }
        if (state === "lost") {
          pausedRef.current = true;
          setPaused(true);
          setStatus(`WebGPU device lost · ${String(detail)}`);
        }
        if (state === "failed") {
          console.error(detail);
          setStatus("The particle renderer could not be loaded.");
        }
      },
      onAnimationChange: (canAnimate) => {
        if (canAnimate) {
          previousFrameTimeRef.current = null;
          requestFrame();
        } else {
          cancelFrame();
        }
      },
    });
    lifecycleRef.current = lifecycle;

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", updatePointer);
      canvas.removeEventListener("pointerleave", clearPointer);
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelFrame();
      void lifecycle.dispose();
      lifecycleRef.current = null;
    };
  });

  const updateDensity = (value: number) => {
    const actualDensity =
      lifecycleRef.current?.setParticleCount(value) ?? value;
    setDensity(actualDensity);
    densityRef.current = actualDensity;
  };

  const updateIntensity = (value: number) => {
    setIntensity(value);
    intensityRef.current = value;
  };

  const updateSpeed = (value: number) => {
    setSpeed(value);
    speedRef.current = value;
  };

  const togglePaused = () => {
    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
    lifecycleRef.current?.setEligibility({ paused: nextPaused });
  };

  return (
    <section
      className={`${styles.experiment} ${styles.fullWidthExperiment}`}
      aria-label="Particle field controls"
    >
      <div className={`${styles.canvasFrame} ${styles.tallCanvasFrame}`}>
        <canvas
          aria-label="An interactive GPU-accelerated particle field"
          className={styles.canvas}
          ref={canvasRef}
          role="img"
        />
        <div
          className={typographyVariants({
            variant: "experimentParticleTelemetry",
            className: styles.telemetry,
          })}
        >
          <span aria-live="polite">{status}</span>
          <output ref={fpsRef}>— fps</output>
        </div>
      </div>
      <div className={styles.controls}>
        <label className={styles.control}>
          <span>Particles</span>
          <output className={styles.controlOutput}>
            {density.toLocaleString()}
          </output>
          <input
            className={styles.controlInput}
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
        <label className={styles.control}>
          <span>Gravity</span>
          <output className={styles.controlOutput}>
            {Math.round(intensity * 100)}%
          </output>
          <input
            className={styles.controlInput}
            max="1.8"
            min="-1.2"
            onChange={(event) =>
              updateIntensity(Number(event.currentTarget.value))
            }
            step="0.05"
            type="range"
            value={intensity}
          />
        </label>
        <label className={styles.control}>
          <span>Simulation speed</span>
          <output className={styles.controlOutput}>{speed.toFixed(1)}×</output>
          <input
            className={styles.controlInput}
            max="8"
            min="0.5"
            onChange={(event) => updateSpeed(Number(event.currentTarget.value))}
            step="0.1"
            type="range"
            value={speed}
          />
        </label>
        <button
          className={styles.controlButton}
          onClick={togglePaused}
          type="button"
        >
          {paused ? "Resume field" : "Pause field"}
        </button>
      </div>
    </section>
  );
}
