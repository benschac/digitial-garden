"use client";

import {
  useAbortableEffect,
  useAnimationFrame,
} from "@personal-site/react-hooks";
import { useRef, useState } from "react";
import { frameDeltaSeconds } from "../wasm-canvas/animation-timing";
import type { ParticleRenderer } from "../wasm-canvas/particle-renderer";
import styles from "../wasm-canvas/wasm-canvas.module.css";
import { createWasmParticleRenderer } from "../wasm-canvas/wasm-particle-renderer";
import { createTypeGpuParticleRenderer } from "./typegpu-particle-renderer";

const DEFAULT_PARTICLE_COUNT = 100_000;
const DEFAULT_SIMULATION_SPEED = 2.5;
const GPU_PARTICLE_LIMIT = 32_000_000;
const GPU_PARTICLE_MINIMUM = 10_000;
const GPU_PARTICLE_STEP = 10_000;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function TypeGpuParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ParticleRenderer | null>(null);
  const fpsRef = useRef<HTMLOutputElement>(null);
  const densityRef = useRef(DEFAULT_PARTICLE_COUNT);
  const intensityRef = useRef(0.85);
  const speedRef = useRef(DEFAULT_SIMULATION_SPEED);
  const pausedRef = useRef(false);
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
    const renderer = rendererRef.current;
    if (!renderer || pausedRef.current || document.hidden) {
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
          (milliseconds - lastFpsUpdateRef.current),
      );
      if (fpsRef.current) {
        fpsRef.current.value = `${framesPerSecond} fps`;
      }
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = milliseconds;
    }

    return true;
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
      rendererRef.current?.resize(
        canvasSize.width,
        canvasSize.height,
        canvasSize.pixelRatio,
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
      if (document.hidden) {
        cancelFrame();
      } else {
        previousFrameTimeRef.current = null;
        requestFrame();
      }
    };

    canvas.addEventListener("pointermove", updatePointer);
    canvas.addEventListener("pointerleave", clearPointer);
    document.addEventListener("visibilitychange", handleVisibility);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      pausedRef.current = true;
      setPaused(true);
    }

    const loadRenderer = async () => {
      let renderer: ParticleRenderer | null = null;

      try {
        renderer = await createTypeGpuParticleRenderer(
          canvas,
          signal,
          densityRef.current,
          canvasSize.width,
          canvasSize.height,
          canvasSize.pixelRatio,
          (message) => {
            if (signal.aborted) {
              return;
            }
            cancelFrame();
            pausedRef.current = true;
            setPaused(true);
            setStatus(`WebGPU device lost · ${message}`);
          },
        );
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        console.warn(
          "TypeGPU initialization failed; using WASM fallback.",
          error,
        );
      }

      if (!renderer && !signal.aborted) {
        try {
          renderer = await createWasmParticleRenderer(
            canvas,
            signal,
            densityRef.current,
            canvasSize.width,
            canvasSize.height,
            canvasSize.pixelRatio,
          );
        } catch (error) {
          if (!isAbortError(error)) {
            console.error(error);
            setStatus("The particle renderer could not be loaded.");
          }
          return;
        }
      }

      if (!renderer || signal.aborted) {
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
      setStatus(
        renderer.kind === "Rust/WASM + WebGPU"
          ? "Rust/WASM control + TypeGPU compute online"
          : "Rust/WASM fallback online",
      );
      requestFrame();
    };

    void loadRenderer();

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", updatePointer);
      canvas.removeEventListener("pointerleave", clearPointer);
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelFrame();
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  });

  const updateDensity = (value: number) => {
    const actualDensity = rendererRef.current?.setParticleCount(value) ?? value;
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
    if (!nextPaused) {
      requestFrame();
    }
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
        <div className={styles.telemetry}>
          <span aria-live="polite">{status}</span>
          <output ref={fpsRef}>— fps</output>
        </div>
      </div>
      <div className={styles.controls}>
        <label>
          <span>Particles</span>
          <output>{density.toLocaleString()}</output>
          <input
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
        <label>
          <span>Gravity</span>
          <output>{Math.round(intensity * 100)}%</output>
          <input
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
        <label>
          <span>Simulation speed</span>
          <output>{speed.toFixed(1)}×</output>
          <input
            max="8"
            min="0.5"
            onChange={(event) => updateSpeed(Number(event.currentTarget.value))}
            step="0.1"
            type="range"
            value={speed}
          />
        </label>
        <button onClick={togglePaused} type="button">
          {paused ? "Resume field" : "Pause field"}
        </button>
      </div>
    </section>
  );
}
