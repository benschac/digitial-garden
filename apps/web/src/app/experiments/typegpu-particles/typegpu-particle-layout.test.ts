import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import { d } from "typegpu";

import { FrameUniforms, ParticleChunk } from "./typegpu-particle-shaders";

test("frame uniforms preserve the WASM command byte layout", () => {
  expect(d.sizeOf(FrameUniforms)).toBe(64);
  expect([
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.dimensions).offset,
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.previousDimensions).offset,
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.pointer).offset,
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.flowPhaseX).offset,
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.flowPhaseY).offset,
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.simulationDeltaSeconds)
      .offset,
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.interaction).offset,
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.activeParticleCount)
      .offset,
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.updateParticleCount)
      .offset,
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.trailAlpha).offset,
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.commandFlags).offset,
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.updateParticleStride)
      .offset,
    d.memoryLayoutOf(FrameUniforms, (frame) => frame.updateParticleOffset)
      .offset,
  ]).toEqual([0, 8, 16, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60]);
});

test("particle chunk uniforms preserve their native upload order", () => {
  expect(d.sizeOf(ParticleChunk)).toBe(16);
  expect([
    d.memoryLayoutOf(ParticleChunk, (chunk) => chunk.baseParticleIndex).offset,
    d.memoryLayoutOf(ParticleChunk, (chunk) => chunk.particleCount).offset,
    d.memoryLayoutOf(ParticleChunk, (chunk) => chunk.padding0).offset,
    d.memoryLayoutOf(ParticleChunk, (chunk) => chunk.padding1).offset,
  ]).toEqual([0, 4, 8, 12]);
});

test("particle shaders compile with the installed TypeGPU transformer", async () => {
  const { default: typegpuPlugin } = await import("unplugin-typegpu/bun");

  const result = await Bun.build({
    entrypoints: [
      fileURLToPath(new URL("typegpu-particle-shaders.ts", import.meta.url)),
    ],
    external: ["typegpu"],
    plugins: [typegpuPlugin()],
    target: "browser",
  });

  expect(result.success).toBe(true);
  const output = await result.outputs[0].text();
  expect(output).toContain("__TYPEGPU_META__");
});
