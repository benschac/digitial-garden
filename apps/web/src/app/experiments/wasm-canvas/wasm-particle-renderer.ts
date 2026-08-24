import { trailAlpha } from "./animation-timing";
import type { ParticleFrame, ParticleRenderer } from "./particle-renderer";
import { loadParticleEngine } from "./wasm-engine";

const MAX_PARTICLE_COUNT = 2_400;
const BACKGROUND = "#05070d";

export async function createWasmParticleRenderer(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
  initialParticleCount: number,
  initialWidth: number,
  initialHeight: number,
  initialPixelRatio: number,
): Promise<ParticleRenderer> {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error("Canvas 2D is unavailable in this browser.");
  }

  const engine = await loadParticleEngine(signal);
  let width = initialWidth;
  let height = initialHeight;
  let previousBuffer: ArrayBufferLike | null = null;
  let particles = new Float32Array();

  const resize = (
    nextWidth: number,
    nextHeight: number,
    pixelRatio: number,
  ) => {
    width = Math.max(1, nextWidth);
    height = Math.max(1, nextHeight);
    const safePixelRatio = Math.min(Math.max(pixelRatio, 1), 2);
    canvas.width = Math.max(1, Math.round(width * safePixelRatio));
    canvas.height = Math.max(1, Math.round(height * safePixelRatio));
    context.setTransform(safePixelRatio, 0, 0, safePixelRatio, 0, 0);
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, width, height);
    engine.resize(width, height);
  };

  engine.initialize(
    0x5eed1234,
    Math.min(initialParticleCount, MAX_PARTICLE_COUNT),
    width,
    height,
  );
  resize(width, height, initialPixelRatio);

  return {
    destroy() {},
    kind: "WebAssembly + Canvas 2D",
    maxParticleCount: MAX_PARTICLE_COUNT,
    render(frame: ParticleFrame) {
      const count = engine.particle_count();
      const pointerAddress = engine.step(
        frame.elapsedSeconds,
        frame.pointerX,
        frame.pointerY,
        frame.interaction,
        frame.simulationSpeed,
      );

      if (
        previousBuffer !== engine.memory.buffer ||
        particles.length !== count * 4
      ) {
        previousBuffer = engine.memory.buffer;
        particles = new Float32Array(previousBuffer, pointerAddress, count * 4);
      }

      context.globalCompositeOperation = "source-over";
      context.globalAlpha = trailAlpha(frame.deltaSeconds);
      context.fillStyle = BACKGROUND;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";
      context.globalAlpha = 0.72;
      context.fillStyle = "rgba(92, 207, 255, 0.72)";

      for (let index = 0; index < count; index += 1) {
        const offset = index * 4;
        const size = particles[offset + 2];
        context.fillRect(
          particles[offset] - size / 2,
          particles[offset + 1] - size / 2,
          size,
          size,
        );
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
    },
    resize,
    setParticleCount(count: number) {
      engine.set_particle_count(Math.min(count, MAX_PARTICLE_COUNT));
      return engine.particle_count();
    },
  };
}
