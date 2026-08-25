"use client";

import { useAbortableEffect } from "@personal-site/react-hooks";
import { useEffect, useRef, useState } from "react";
import { perlinNoise2D } from "@/lib/perlin-noise";
import { loadParticleEngine } from "../wasm-canvas/wasm-engine";
import styles from "./perlin-noise.module.css";

const SAMPLE_SIZE = 256;
const DEFAULT_FREQUENCY = 5;
const DEFAULT_OFFSET_X = 0;
const DEFAULT_OFFSET_Y = 0;
const DIFFERENCE_GAIN = 1e15;

type ComparisonMetrics = {
  maxDifference: number;
  meanDifference: number;
  rustMilliseconds: number;
  typescriptMilliseconds: number;
};

const EMPTY_METRICS: ComparisonMetrics = {
  maxDifference: 0,
  meanDifference: 0,
  rustMilliseconds: 0,
  typescriptMilliseconds: 0,
};

/**
 * Coordinates the interactive TypeScript-versus-Rust noise comparison.
 *
 * On mount, the component loads the compiled particle-engine WASM module and
 * extracts its exported Perlin function. A second effect re-samples both
 * implementations whenever the scale or offsets change, paints all three
 * canvases, and publishes timing and difference metrics back to the controls.
 * Canvas pixel buffers stay outside React state so large image data never
 * participates in reconciliation.
 *
 * @returns The comparison panels, numerical readout, and sampling controls.
 */
export function PerlinNoiseExperiment() {
  const typescriptCanvasRef = useRef<HTMLCanvasElement>(null);
  const rustCanvasRef = useRef<HTMLCanvasElement>(null);
  const differenceCanvasRef = useRef<HTMLCanvasElement>(null);
  const [frequency, setFrequency] = useState(DEFAULT_FREQUENCY);
  const [offsetX, setOffsetX] = useState(DEFAULT_OFFSET_X);
  const [offsetY, setOffsetY] = useState(DEFAULT_OFFSET_Y);
  const [rustNoise, setRustNoise] = useState<
    ((x: number, y: number) => number) | null
  >(null);
  const [status, setStatus] = useState<"error" | "loading" | "ready">(
    "loading",
  );
  const [metrics, setMetrics] = useState(EMPTY_METRICS);

  useAbortableEffect((signal) => {
    loadParticleEngine(signal)
      .then((engine) => {
        setRustNoise(() => engine.perlin_noise_2d);
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
    const typescriptCanvas = typescriptCanvasRef.current;
    const rustCanvas = rustCanvasRef.current;
    const differenceCanvas = differenceCanvasRef.current;
    if (!rustNoise || !typescriptCanvas || !rustCanvas || !differenceCanvas) {
      return;
    }

    const nextMetrics = renderComparison(
      typescriptCanvas,
      rustCanvas,
      differenceCanvas,
      rustNoise,
      frequency,
      offsetX,
      offsetY,
    );
    setMetrics(nextMetrics);
  }, [frequency, offsetX, offsetY, rustNoise]);

  const isDefaultView =
    frequency === DEFAULT_FREQUENCY &&
    offsetX === DEFAULT_OFFSET_X &&
    offsetY === DEFAULT_OFFSET_Y;

  /**
   * Restores the coordinate window used when the experiment first loads.
   * React batches these state updates into a single render and comparison pass.
   */
  const resetView = () => {
    setFrequency(DEFAULT_FREQUENCY);
    setOffsetX(DEFAULT_OFFSET_X);
    setOffsetY(DEFAULT_OFFSET_Y);
  };

  return (
    <section className={styles.experiment} aria-labelledby="comparison-title">
      <div className={styles.experimentHeader}>
        <div>
          <p className={styles.kicker}>Live comparison</p>
          <h2 id="comparison-title">One coordinate grid, sampled twice.</h2>
        </div>
        <p
          aria-live="polite"
          className={styles.runtimeStatus}
          data-status={status}
        >
          {status === "loading" ? "Loading Rust/WASM…" : null}
          {status === "ready" ? "Rust/WASM ready" : null}
          {status === "error" ? "Rust/WASM failed to load" : null}
        </p>
      </div>

      <div className={styles.panels}>
        <NoisePanel
          canvasRef={typescriptCanvasRef}
          detail={`${metrics.typescriptMilliseconds.toFixed(2)} ms`}
          label="TypeScript"
        />
        <NoisePanel
          canvasRef={rustCanvasRef}
          detail={`${metrics.rustMilliseconds.toFixed(2)} ms`}
          label="Rust / WASM"
        />
        <NoisePanel
          canvasRef={differenceCanvasRef}
          detail={`Difference × ${DIFFERENCE_GAIN.toExponential(0)}`}
          label="Amplified delta"
        />
      </div>

      {status === "error" ? (
        <p className={styles.errorMessage} role="alert">
          The TypeScript field is available, but the compiled Rust module could
          not be loaded. Rebuild the WASM artifact and refresh this page.
        </p>
      ) : null}

      <div className={styles.readout} aria-live="polite">
        <div>
          <span className={styles.metricLabel}>Maximum difference</span>
          <strong className={styles.metricValue}>
            {formatDifference(metrics.maxDifference)}
          </strong>
        </div>
        <div>
          <span className={styles.metricLabel}>Mean difference</span>
          <strong className={styles.metricValue}>
            {formatDifference(metrics.meanDifference)}
          </strong>
        </div>
        <p>
          {status === "ready" && metrics.maxDifference === 0
            ? "Pixel-perfect agreement at this view."
            : "Any disagreement appears as light in the delta panel."}
        </p>
      </div>

      <div className={styles.controls}>
        <label>
          <span>Scale</span>
          <output>{frequency.toFixed(2)}</output>
          <input
            max="16"
            min="1"
            onChange={(event) =>
              setFrequency(Number(event.currentTarget.value))
            }
            step="0.25"
            type="range"
            value={frequency}
          />
        </label>
        <label>
          <span>Horizontal offset</span>
          <output>{offsetX.toFixed(2)}</output>
          <input
            max="32"
            min="-32"
            onChange={(event) => setOffsetX(Number(event.currentTarget.value))}
            step="0.25"
            type="range"
            value={offsetX}
          />
        </label>
        <label>
          <span>Vertical offset</span>
          <output>{offsetY.toFixed(2)}</output>
          <input
            max="32"
            min="-32"
            onChange={(event) => setOffsetY(Number(event.currentTarget.value))}
            step="0.25"
            type="range"
            value={offsetY}
          />
        </label>
        <button disabled={isDefaultView} onClick={resetView} type="button">
          Reset view
        </button>
      </div>
    </section>
  );
}

/**
 * Presents one labeled canvas and its associated timing or diagnostic detail.
 *
 * The parent owns and paints the canvas through `canvasRef`; this component is
 * intentionally presentational so all three panels share identical markup.
 *
 * @param props - Display information and the canvas reference to attach.
 * @param props.canvasRef - Ref used by the comparison renderer to access the
 * panel's backing canvas.
 * @param props.detail - Secondary text, such as elapsed milliseconds or the
 * difference amplification factor.
 * @param props.label - Human-readable runtime or diagnostic panel name.
 * @returns A figure containing the canvas and its caption.
 */
function NoisePanel({
  canvasRef,
  detail,
  label,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  detail: string;
  label: string;
}) {
  return (
    <figure className={styles.panel}>
      <canvas
        aria-label={`${label} Perlin noise field`}
        height={SAMPLE_SIZE}
        ref={canvasRef}
        role="img"
        width={SAMPLE_SIZE}
      />
      <figcaption>
        <strong>{label}</strong>
        <span className={styles.panelDetail}>{detail}</span>
      </figcaption>
    </figure>
  );
}

/**
 * Samples both implementations over the same coordinate grid and paints the
 * TypeScript, Rust/WASM, and amplified-difference canvases.
 *
 * TypeScript and Rust are timed in separate loops so neither duration includes
 * color conversion or canvas writes. A final shared loop compares each sample,
 * accumulates numerical error, and converts values into RGBA pixels. Timing is
 * useful for casual exploration only; it is not a controlled benchmark.
 *
 * @param typescriptCanvas - Destination for pixels generated by TypeScript.
 * @param rustCanvas - Destination for pixels generated by Rust/WASM.
 * @param differenceCanvas - Destination for amplified absolute differences.
 * @param rustNoise - The `perlin_noise_2d` function exported by WebAssembly.
 * @param frequency - Width and height of the sampled square in noise-space
 * units. Larger values reveal more lattice cells in the same canvas.
 * @param offsetX - Noise-space coordinate at the canvas's left edge.
 * @param offsetY - Noise-space coordinate at the canvas's top edge.
 * @returns Timing plus maximum and mean absolute difference metrics.
 */
function renderComparison(
  typescriptCanvas: HTMLCanvasElement,
  rustCanvas: HTMLCanvasElement,
  differenceCanvas: HTMLCanvasElement,
  rustNoise: (x: number, y: number) => number,
  frequency: number,
  offsetX: number,
  offsetY: number,
): ComparisonMetrics {
  const sampleCount = SAMPLE_SIZE * SAMPLE_SIZE;
  const typescriptSamples = new Float64Array(sampleCount);
  const rustSamples = new Float64Array(sampleCount);
  const typescriptStart = performance.now();

  for (let index = 0; index < sampleCount; index += 1) {
    const pixelX = index % SAMPLE_SIZE;
    const pixelY = Math.floor(index / SAMPLE_SIZE);
    const x = offsetX + (pixelX / SAMPLE_SIZE) * frequency;
    const y = offsetY + (pixelY / SAMPLE_SIZE) * frequency;
    typescriptSamples[index] = perlinNoise2D(x, y);
  }
  const typescriptMilliseconds = performance.now() - typescriptStart;
  const rustStart = performance.now();

  for (let index = 0; index < sampleCount; index += 1) {
    const pixelX = index % SAMPLE_SIZE;
    const pixelY = Math.floor(index / SAMPLE_SIZE);
    const x = offsetX + (pixelX / SAMPLE_SIZE) * frequency;
    const y = offsetY + (pixelY / SAMPLE_SIZE) * frequency;
    rustSamples[index] = rustNoise(x, y);
  }
  const rustMilliseconds = performance.now() - rustStart;
  const typescriptImage = createImage(typescriptCanvas);
  const rustImage = createImage(rustCanvas);
  const differenceImage = createImage(differenceCanvas);
  let maxDifference = 0;
  let differenceTotal = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const typescriptNoise = typescriptSamples[index];
    const rustNoiseValue = rustSamples[index];
    const difference = Math.abs(typescriptNoise - rustNoiseValue);
    maxDifference = Math.max(maxDifference, difference);
    differenceTotal += difference;

    const byteIndex = index * 4;
    writeNoiseColor(typescriptImage.data, byteIndex, typescriptNoise);
    writeNoiseColor(rustImage.data, byteIndex, rustNoiseValue);
    writeDifferenceColor(differenceImage.data, byteIndex, difference);
  }

  putImage(typescriptCanvas, typescriptImage);
  putImage(rustCanvas, rustImage);
  putImage(differenceCanvas, differenceImage);

  return {
    maxDifference,
    meanDifference: differenceTotal / sampleCount,
    rustMilliseconds,
    typescriptMilliseconds,
  };
}

/**
 * Allocates an empty RGBA image matching the experiment's fixed sample grid.
 *
 * @param canvas - Canvas whose 2D rendering context creates the image buffer.
 * @returns A mutable `ImageData` buffer with one pixel per noise sample.
 * @throws If the browser cannot provide a 2D canvas context.
 */
function createImage(canvas: HTMLCanvasElement): ImageData {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(
      "A 2D canvas context is required for the noise comparison.",
    );
  }
  return context.createImageData(SAMPLE_SIZE, SAMPLE_SIZE);
}

/**
 * Copies a completed image buffer onto its visible canvas in one operation.
 *
 * @param canvas - Canvas that should display the image.
 * @param image - Fully populated RGBA buffer to commit.
 * @throws If the browser cannot provide a 2D canvas context.
 */
function putImage(canvas: HTMLCanvasElement, image: ImageData) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(
      "A 2D canvas context is required for the noise comparison.",
    );
  }
  context.putImageData(image, 0, 0);
}

/**
 * Maps one signed noise sample into the experiment's navy-to-cream-to-rust
 * palette and writes it directly into an RGBA buffer.
 *
 * Negative values blend from navy toward cream; positive values blend from
 * cream toward rust. Direct channel writes avoid creating a CSS color string
 * for every pixel.
 *
 * @param data - Destination canvas pixel buffer.
 * @param index - Byte offset of the pixel's red channel, normally pixel index
 * multiplied by four.
 * @param noise - Signed Perlin sample, normally near `[-1, 1]`.
 */
function writeNoiseColor(
  data: Uint8ClampedArray,
  index: number,
  noise: number,
) {
  const normalized = Math.min(Math.max((noise + 1) / 2, 0), 1);
  const lowerHalf = normalized < 0.5;
  const amount = lowerHalf ? normalized * 2 : (normalized - 0.5) * 2;
  const start = lowerHalf ? [10, 24, 39] : [226, 211, 174];
  const end = lowerHalf ? [226, 211, 174] : [190, 75, 48];

  data[index] = start[0] + (end[0] - start[0]) * amount;
  data[index + 1] = start[1] + (end[1] - start[1]) * amount;
  data[index + 2] = start[2] + (end[2] - start[2]) * amount;
  data[index + 3] = 255;
}

/**
 * Converts a tiny absolute numerical difference into a visible diagnostic
 * pixel using {@link DIFFERENCE_GAIN}.
 *
 * Exact agreement remains nearly black. Differences approach a warm highlight
 * as the amplified value reaches one, making floating-point drift visible even
 * when it is far below the normal color map's perceptual range.
 *
 * @param data - Destination difference-panel pixel buffer.
 * @param index - Byte offset of the pixel's red channel.
 * @param difference - Absolute difference between TypeScript and Rust samples.
 */
function writeDifferenceColor(
  data: Uint8ClampedArray,
  index: number,
  difference: number,
) {
  const amplified = Math.min(difference * DIFFERENCE_GAIN, 1);
  data[index] = 19 + amplified * 236;
  data[index + 1] = 22 + amplified * 119;
  data[index + 2] = 24 + amplified * 63;
  data[index + 3] = 255;
}

/**
 * Formats a numerical error for the compact metrics readout.
 *
 * @param value - Maximum or mean absolute sample difference.
 * @returns Plain `"0"` for exact agreement or scientific notation with four
 * significant digits for a non-zero difference.
 */
function formatDifference(value: number) {
  return value === 0 ? "0" : value.toExponential(3);
}
