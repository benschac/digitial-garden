"use client";

import { useAbortableEffect } from "@personal-site/react-hooks";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ElementRef, Ref } from "react";
import { useEffect, useRef, useState } from "react";
import { perlinNoise3D } from "@/lib/perlin-noise";
import { loadParticleEngine } from "../wasm-canvas/wasm-engine";
import styles from "./perlin-noise.module.css";

const SURFACE_SEGMENTS = 64;
const SURFACE_SIZE = 2.8;
const SURFACE_AMPLITUDE = 0.78;
const DEFAULT_FREQUENCY = 1.35;
const DEFAULT_X_OFFSET = 0;
const DEFAULT_Y_OFFSET = 0;
const DEFAULT_Z_OFFSET = 0;
const DEFAULT_ANIMATION_SPEED = 0.45;
const NOISE_PERIOD = 256;
const MAX_FRAME_DELTA = 1 / 15;
const PARITY_SAMPLE_INTERVAL = 0.2;

type Noise3D = (x: number, y: number, z: number) => number;

type SurfaceSettings = {
  frequency: number;
  xOffset: number;
  yOffset: number;
  zOffset: number;
};

type NoiseSurfacePairProps = SurfaceSettings & {
  animationSpeed: number;
  isPlaying: boolean;
  onAnimatedZOffset: (zOffset: number) => void;
  onParitySample: (zOffset: number) => void;
  rustNoise: Noise3D | null;
};

/**
 * Renders two displaced surfaces sampled from matching TypeScript and Rust 3D
 * Perlin functions, with controls for moving through the shared noise volume.
 *
 * @returns The React Three Fiber scene, parity readout, and coordinate controls.
 */
export function PerlinNoise3DExperiment() {
  const [frequency, setFrequency] = useState(DEFAULT_FREQUENCY);
  const [xOffset, setXOffset] = useState(DEFAULT_X_OFFSET);
  const [yOffset, setYOffset] = useState(DEFAULT_Y_OFFSET);
  const [zOffset, setZOffset] = useState(DEFAULT_Z_OFFSET);
  const [animationSpeed, setAnimationSpeed] = useState(DEFAULT_ANIMATION_SPEED);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rustNoise, setRustNoise] = useState<Noise3D | null>(null);
  const [status, setStatus] = useState<"error" | "loading" | "ready">(
    "loading",
  );
  const [maxDifference, setMaxDifference] = useState(0);
  const animatedZOffsetRef = useRef(DEFAULT_Z_OFFSET);
  const zOffsetInputRef = useRef<HTMLInputElement>(null);
  const zOffsetOutputRef = useRef<HTMLOutputElement>(null);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (!reducedMotionQuery.matches) {
      setIsPlaying(true);
    }

    /** Pauses automatic movement when the operating-system preference changes. */
    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        return;
      }

      setZOffset(animatedZOffsetRef.current);
      setIsPlaying(false);
    };

    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
    return () =>
      reducedMotionQuery.removeEventListener(
        "change",
        handleReducedMotionChange,
      );
  }, []);

  useAbortableEffect((signal) => {
    loadParticleEngine(signal)
      .then((engine) => {
        setRustNoise(() => engine.perlin_noise_3d);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error(error);
        setStatus("error");
      });
  });

  useEffect(() => {
    if (!rustNoise) {
      return;
    }

    setMaxDifference(
      measureSurfaceDifference(perlinNoise3D, rustNoise, {
        frequency,
        xOffset,
        yOffset,
        zOffset,
      }),
    );
  }, [frequency, rustNoise, xOffset, yOffset, zOffset]);

  const isDefaultView =
    !isPlaying &&
    frequency === DEFAULT_FREQUENCY &&
    xOffset === DEFAULT_X_OFFSET &&
    yOffset === DEFAULT_Y_OFFSET &&
    zOffset === DEFAULT_Z_OFFSET &&
    animationSpeed === DEFAULT_ANIMATION_SPEED;

  /** Restores the first slice through the 3D field. */
  const resetView = () => {
    animatedZOffsetRef.current = DEFAULT_Z_OFFSET;
    setIsPlaying(false);
    setFrequency(DEFAULT_FREQUENCY);
    setXOffset(DEFAULT_X_OFFSET);
    setYOffset(DEFAULT_Y_OFFSET);
    setZOffset(DEFAULT_Z_OFFSET);
    setAnimationSpeed(DEFAULT_ANIMATION_SPEED);
  };

  const settings = { frequency, xOffset, yOffset, zOffset };

  /** Mirrors the transient animation value into the visible ZOFF control. */
  const reportAnimatedZOffset = (value: number) => {
    animatedZOffsetRef.current = value;

    if (zOffsetInputRef.current) {
      zOffsetInputRef.current.value = String(value);
    }
    if (zOffsetOutputRef.current) {
      zOffsetOutputRef.current.value = value.toFixed(2);
    }
  };

  /** Rechecks TypeScript/WASM parity periodically without doing React work every frame. */
  const sampleAnimatedParity = (animatedZOffset: number) => {
    if (!rustNoise) {
      return;
    }

    setMaxDifference(
      measureSurfaceDifference(perlinNoise3D, rustNoise, {
        frequency,
        xOffset,
        yOffset,
        zOffset: animatedZOffset,
      }),
    );
  };

  /** Starts or pauses the volume traversal while preserving the current slice. */
  const toggleAnimation = () => {
    if (isPlaying) {
      setZOffset(animatedZOffsetRef.current);
    }
    setIsPlaying((playing) => !playing);
  };

  /** Moves the manual ZOFF control and the animation cursor together. */
  const changeZOffset = (value: number) => {
    animatedZOffsetRef.current = value;
    setZOffset(value);
  };

  return (
    <section
      className={styles.threeExperiment}
      aria-labelledby="noise-3d-title"
    >
      <div className={styles.threeHeader}>
        <div>
          <p className={styles.kicker}>First 3D pass</p>
          <h2 id="noise-3d-title">A volume, viewed as terrain.</h2>
          <p>
            Each surface displaces the same 64 × 64 grid. XOFF and YOFF move
            across a slice; ZOFF moves deeper into the noise volume.
          </p>
        </div>
        <div className={styles.threeMetric} aria-live="polite">
          <span>Maximum difference</span>
          <strong>{formatDifference(maxDifference)}</strong>
          <small data-status={status}>
            {status === "loading" ? "Loading Rust/WASM…" : null}
            {status === "ready" ? "Surfaces agree" : null}
            {status === "error" ? "Rust/WASM unavailable" : null}
          </small>
        </div>
      </div>

      <div className={styles.threeCanvasFrame}>
        <Canvas
          camera={{ fov: 42, position: [0, 3.8, 6.4] }}
          className={styles.threeCanvas}
          dpr={[1, 1.75]}
          frameloop={isPlaying ? "always" : "demand"}
        >
          <color attach="background" args={["#111517"]} />
          <ambientLight intensity={1.5} />
          <directionalLight intensity={3.2} position={[-3, 5, 4]} />
          <directionalLight
            color="#d76f4d"
            intensity={1.5}
            position={[4, 2, -2]}
          />
          <gridHelper args={[8, 16, "#59615f", "#282f31"]} />
          <NoiseSurfacePair
            {...settings}
            animationSpeed={animationSpeed}
            isPlaying={isPlaying}
            onAnimatedZOffset={reportAnimatedZOffset}
            onParitySample={sampleAnimatedParity}
            rustNoise={rustNoise}
          />
        </Canvas>
        <div className={styles.threeLegend} aria-hidden="true">
          <span>TypeScript</span>
          <span>Rust / WASM</span>
        </div>
      </div>

      {status === "error" ? (
        <p className={styles.errorMessage} role="alert">
          The TypeScript surface is visible, but the Rust surface could not be
          loaded. Rebuild the WASM artifact and refresh this page.
        </p>
      ) : null}

      <div className={styles.threeControls}>
        <NoiseSlider
          label="Frequency"
          max={3}
          min={0.5}
          onChange={setFrequency}
          step={0.05}
          value={frequency}
        />
        <NoiseSlider
          label="XOFF"
          max={8}
          min={-8}
          onChange={setXOffset}
          step={0.1}
          value={xOffset}
        />
        <NoiseSlider
          label="YOFF"
          max={8}
          min={-8}
          onChange={setYOffset}
          step={0.1}
          value={yOffset}
        />
        <NoiseSlider
          disabled={isPlaying}
          inputRef={zOffsetInputRef}
          label="ZOFF"
          max={NOISE_PERIOD / 2}
          min={-NOISE_PERIOD / 2}
          onChange={changeZOffset}
          outputRef={zOffsetOutputRef}
          step={0.1}
          value={zOffset}
        />
        <NoiseSlider
          label="Speed"
          max={2}
          min={0.1}
          onChange={setAnimationSpeed}
          step={0.05}
          value={animationSpeed}
        />
        <div className={styles.threeControlActions}>
          <button
            aria-pressed={isPlaying}
            onClick={toggleAnimation}
            type="button"
          >
            {isPlaying ? "Pause loop" : "Play loop"}
          </button>
          <button disabled={isDefaultView} onClick={resetView} type="button">
            Reset 3D view
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Displaces both surfaces from one shared, optionally animated Z coordinate.
 *
 * Keeping the animation cursor and geometry writes inside the render loop means
 * React only handles controls and the throttled parity measurement.
 *
 * @param props - Noise functions, sampling controls, and animation callbacks.
 * @returns Matching TypeScript and Rust/WASM terrain meshes.
 */
function NoiseSurfacePair({
  animationSpeed,
  frequency,
  isPlaying,
  onAnimatedZOffset,
  onParitySample,
  rustNoise,
  xOffset,
  yOffset,
  zOffset,
}: NoiseSurfacePairProps) {
  const typescriptGeometryRef = useRef<ElementRef<"planeGeometry">>(null);
  const rustGeometryRef = useRef<ElementRef<"planeGeometry">>(null);
  const animatedZOffsetRef = useRef(zOffset);
  const parityElapsedRef = useRef(0);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!isPlaying) {
      animatedZOffsetRef.current = zOffset;
    }

    updateSurfaceGeometry(
      typescriptGeometryRef.current,
      perlinNoise3D,
      frequency,
      xOffset,
      yOffset,
      animatedZOffsetRef.current,
    );
    updateSurfaceGeometry(
      rustGeometryRef.current,
      rustNoise,
      frequency,
      xOffset,
      yOffset,
      animatedZOffsetRef.current,
    );
    invalidate();
  }, [frequency, invalidate, isPlaying, rustNoise, xOffset, yOffset, zOffset]);

  useFrame((_state, delta) => {
    if (!isPlaying) {
      return;
    }

    const boundedDelta = Math.min(delta, MAX_FRAME_DELTA);
    const animatedZOffset = wrapNoiseOffset(
      animatedZOffsetRef.current + boundedDelta * animationSpeed,
    );
    animatedZOffsetRef.current = animatedZOffset;

    updateSurfaceGeometry(
      typescriptGeometryRef.current,
      perlinNoise3D,
      frequency,
      xOffset,
      yOffset,
      animatedZOffset,
    );
    updateSurfaceGeometry(
      rustGeometryRef.current,
      rustNoise,
      frequency,
      xOffset,
      yOffset,
      animatedZOffset,
    );
    onAnimatedZOffset(animatedZOffset);

    parityElapsedRef.current += boundedDelta;
    if (parityElapsedRef.current >= PARITY_SAMPLE_INTERVAL) {
      parityElapsedRef.current = 0;
      onParitySample(animatedZOffset);
    }
  });

  return (
    <>
      <NoiseSurfaceMesh
        geometryRef={typescriptGeometryRef}
        position={[-1.65, 0.15, 0]}
      />
      {rustNoise ? (
        <NoiseSurfaceMesh
          geometryRef={rustGeometryRef}
          position={[1.65, 0.15, 0]}
        />
      ) : null}
    </>
  );
}

/**
 * Renders one plane whose vertex buffer is owned by the shared surface pair.
 *
 * @param props - Geometry ref and world position for one implementation.
 * @returns A lit React Three Fiber terrain mesh.
 */
function NoiseSurfaceMesh({
  geometryRef,
  position,
}: {
  geometryRef: Ref<ElementRef<"planeGeometry">>;
  position: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry
        args={[SURFACE_SIZE, SURFACE_SIZE, SURFACE_SEGMENTS, SURFACE_SEGMENTS]}
        ref={geometryRef}
      />
      <meshStandardMaterial color="#c96849" metalness={0.08} roughness={0.7} />
    </mesh>
  );
}

/**
 * Renders one controlled slider with a live fixed-precision readout.
 *
 * @param props - Slider range, label, current value, and update callback.
 * @returns A labeled range control.
 */
function NoiseSlider({
  disabled = false,
  inputRef,
  label,
  max,
  min,
  onChange,
  outputRef,
  step,
  value,
}: {
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  outputRef?: Ref<HTMLOutputElement>;
  step: number;
  value: number;
}) {
  return (
    <label>
      <span>{label}</span>
      <output ref={outputRef}>{value.toFixed(2)}</output>
      <input
        disabled={disabled}
        ref={inputRef}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

/**
 * Writes fresh height samples into a plane without allocating new geometry.
 *
 * @param geometry - Existing plane geometry, or `null` before it mounts.
 * @param noise - Noise implementation used for this surface.
 * @param frequency - Scale applied to local plane coordinates.
 * @param xOffset - Horizontal position in the noise volume.
 * @param yOffset - Vertical position in the noise volume.
 * @param zOffset - Depth of the current volume slice.
 */
function updateSurfaceGeometry(
  geometry: ElementRef<"planeGeometry"> | null,
  noise: Noise3D | null,
  frequency: number,
  xOffset: number,
  yOffset: number,
  zOffset: number,
) {
  if (!geometry || !noise) {
    return;
  }

  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const localX = positions.getX(index);
    const localY = positions.getY(index);
    const sample = noise(
      xOffset + localX * frequency,
      yOffset + localY * frequency,
      zOffset,
    );
    positions.setZ(index, sample * SURFACE_AMPLITUDE);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Wraps Z at the permutation-table period so the animation repeats seamlessly.
 *
 * @param offset - Unbounded position along the noise volume's Z axis.
 * @returns The equivalent offset in the half-open range `[-128, 128)`.
 */
function wrapNoiseOffset(offset: number) {
  const halfPeriod = NOISE_PERIOD / 2;
  return (
    ((((offset + halfPeriod) % NOISE_PERIOD) + NOISE_PERIOD) % NOISE_PERIOD) -
    halfPeriod
  );
}

/**
 * Measures parity at every vertex represented by the rendered surface grid.
 *
 * @param typescriptNoise - TypeScript 3D noise implementation.
 * @param rustNoise - Rust/WASM 3D noise implementation.
 * @param settings - Current frequency and X/Y/Z offsets.
 * @returns The largest absolute difference across the grid.
 */
function measureSurfaceDifference(
  typescriptNoise: Noise3D,
  rustNoise: Noise3D,
  settings: SurfaceSettings,
) {
  const vertexCount = SURFACE_SEGMENTS + 1;
  let maxDifference = 0;

  for (let row = 0; row < vertexCount; row += 1) {
    const localY = (row / SURFACE_SEGMENTS - 0.5) * SURFACE_SIZE;
    for (let column = 0; column < vertexCount; column += 1) {
      const localX = (column / SURFACE_SEGMENTS - 0.5) * SURFACE_SIZE;
      const x = settings.xOffset + localX * settings.frequency;
      const y = settings.yOffset + localY * settings.frequency;
      const typescriptValue = typescriptNoise(x, y, settings.zOffset);
      const rustValue = rustNoise(x, y, settings.zOffset);
      maxDifference = Math.max(
        maxDifference,
        Math.abs(typescriptValue - rustValue),
      );
    }
  }

  return maxDifference;
}

/** Formats exact agreement plainly and drift in compact scientific notation. */
function formatDifference(value: number) {
  return value === 0 ? "0" : value.toExponential(3);
}
