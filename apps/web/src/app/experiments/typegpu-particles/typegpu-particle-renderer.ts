import { d, tgpu } from "typegpu";
import type {
  ParticleFrame,
  ParticleRenderer,
} from "../wasm-canvas/particle-renderer";
import { loadParticleEngine } from "../wasm-canvas/wasm-engine";
import {
  compositeLayout,
  computeLayout,
  FrameUniforms,
  Particle,
  ParticleChunk,
  particleRenderLayout,
  shaderSource,
  trailLayout,
  WORKGROUP_SIZE,
} from "./typegpu-particle-shaders";

const BUFFER_USAGE_COPY_DST = 0x0008;
const BUFFER_USAGE_UNIFORM = 0x0040;
const BUFFER_USAGE_STORAGE = 0x0080;
const TEXTURE_USAGE_TEXTURE_BINDING = 0x04;
const TEXTURE_USAGE_RENDER_ATTACHMENT = 0x10;

const BACKGROUND = {
  a: 1,
  b: 13 / 255,
  g: 7 / 255,
  r: 5 / 255,
};
const HIGH_DENSITY_PARTICLE_COUNT = 450_000;
const MAX_GPU_PARTICLE_COUNT = 32_000_000;
const MAX_PARTICLE_CHUNK_COUNT = 2;
const MAX_POINT_PARTICLES_PER_FRAME = 1_050_000;
const PARTICLES_PER_CHUNK = 16_000_000;
const PARTICLE_STRIDE = d.sizeOf(Particle);
const PORTABLE_GPU_PARTICLE_COUNT = 8_000_000;
const TARGET_PARTICLE_BUFFER_SIZE = PARTICLES_PER_CHUNK * PARTICLE_STRIDE;
const CHUNK_UNIFORM_SIZE = d.sizeOf(ParticleChunk);
const ACTIVE_PARTICLE_COUNT_WORD = 10;
const COMMAND_FLAGS_WORD = 13;
const UNIFORM_FLOATS = 16;
const UNIFORM_SIZE = d.sizeOf(FrameUniforms);
const UPDATE_PARTICLE_OFFSET_WORD = 15;
const UPDATE_PARTICLE_STRIDE_WORD = 14;

function getGpuApi(): GPU | null {
  return navigator.gpu ?? null;
}

async function assertShaderCompiled(
  shaderModule: GPUShaderModule,
  label: string,
) {
  if (!shaderModule.getCompilationInfo) {
    return;
  }

  const compilationInfo = await shaderModule.getCompilationInfo();
  const errors = compilationInfo.messages.filter(
    (message) => message.type === "error",
  );
  if (errors.length === 0) {
    return;
  }

  const details = errors
    .map((error) => `${error.lineNum}:${error.linePos} ${error.message}`)
    .join("\n");
  throw new Error(`${label} failed to compile:\n${details}`);
}

export async function createTypeGpuParticleRenderer(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
  initialParticleCount: number,
  initialWidth: number,
  initialHeight: number,
  initialPixelRatio: number,
  onDeviceLost: (message: string) => void,
): Promise<ParticleRenderer | null> {
  const gpu = getGpuApi();
  if (!gpu) {
    return null;
  }

  const adapter = await gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter || signal.aborted) {
    return null;
  }

  const supportsExtendedParticleBuffer =
    adapter.limits.maxBufferSize >= TARGET_PARTICLE_BUFFER_SIZE &&
    adapter.limits.maxStorageBufferBindingSize >= TARGET_PARTICLE_BUFFER_SIZE &&
    adapter.limits.maxComputeWorkgroupsPerDimension * WORKGROUP_SIZE >=
      PARTICLES_PER_CHUNK;
  const requestedParticleCount = supportsExtendedParticleBuffer
    ? MAX_GPU_PARTICLE_COUNT
    : PORTABLE_GPU_PARTICLE_COUNT;
  const device = await adapter.requestDevice({
    requiredLimits: supportsExtendedParticleBuffer
      ? {
          maxStorageBufferBindingSize: TARGET_PARTICLE_BUFFER_SIZE,
        }
      : undefined,
  });
  if (signal.aborted) {
    device.destroy();
    throw new DOMException("The renderer load was aborted.", "AbortError");
  }
  const root = tgpu.initFromDevice({ device });

  let engine: Awaited<ReturnType<typeof loadParticleEngine>>;
  try {
    engine = await loadParticleEngine(signal);
  } catch (error) {
    root.destroy();
    device.destroy();
    throw error;
  }

  const particlesPerChunk = Math.max(
    1,
    Math.min(
      PARTICLES_PER_CHUNK,
      Math.floor(device.limits.maxStorageBufferBindingSize / PARTICLE_STRIDE),
      device.limits.maxComputeWorkgroupsPerDimension * WORKGROUP_SIZE,
    ),
  );
  const maxParticleCount = Math.max(
    1,
    Math.min(
      requestedParticleCount,
      particlesPerChunk * MAX_PARTICLE_CHUNK_COUNT,
    ),
  );
  if (engine.gpu_frame_command_byte_length() !== UNIFORM_SIZE) {
    root.destroy();
    device.destroy();
    throw new Error("The Rust/WASM and TypeGPU frame layouts differ.");
  }
  let activeParticleCount = engine.initialize_gpu_controller(
    maxParticleCount,
    initialParticleCount,
    Math.max(initialWidth, 1),
    Math.max(initialHeight, 1),
  );
  const particleChunks = Array.from(
    { length: Math.ceil(maxParticleCount / particlesPerChunk) },
    (_, index) => {
      const baseParticleIndex = index * particlesPerChunk;
      const particleCount = Math.min(
        particlesPerChunk,
        maxParticleCount - baseParticleIndex,
      );
      const particleBuffer = device.createBuffer({
        label: `particle-state-${index}`,
        size: particleCount * PARTICLE_STRIDE,
        usage: BUFFER_USAGE_STORAGE,
      });
      const chunkUniformBuffer = device.createBuffer({
        label: `particle-chunk-uniforms-${index}`,
        size: CHUNK_UNIFORM_SIZE,
        usage: BUFFER_USAGE_UNIFORM | BUFFER_USAGE_COPY_DST,
      });
      device.queue.writeBuffer(
        chunkUniformBuffer,
        0,
        new Uint32Array([baseParticleIndex, particleCount, 0, 0]),
      );
      return {
        baseParticleIndex,
        chunkUniformBuffer,
        particleBuffer,
        particleCount,
      };
    },
  );
  const destroyParticleChunks = () => {
    for (const chunk of particleChunks) {
      chunk.particleBuffer.destroy();
      chunk.chunkUniformBuffer.destroy();
    }
  };
  const uniformBuffer = device.createBuffer({
    label: "particle-frame-uniforms",
    size: UNIFORM_SIZE,
    usage: BUFFER_USAGE_UNIFORM | BUFFER_USAGE_COPY_DST,
  });

  const computeModule = device.createShaderModule({
    code: shaderSource.compute(),
    label: "particle-compute-shader",
  });
  const particleModule = device.createShaderModule({
    code: shaderSource.particles(),
    label: "particle-render-shader",
  });
  const fullscreenModule = device.createShaderModule({
    code: shaderSource.fullscreen(),
    label: "particle-trail-shader",
  });
  await Promise.all([
    assertShaderCompiled(computeModule, "Particle compute shader"),
    assertShaderCompiled(particleModule, "Particle render shader"),
    assertShaderCompiled(fullscreenModule, "Particle trail shader"),
  ]);

  const canvasFormat = gpu.getPreferredCanvasFormat();
  const computePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [root.unwrap(computeLayout)],
    label: "typegpu-particle-compute-layout",
  });
  const particlePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [root.unwrap(particleRenderLayout)],
    label: "typegpu-particle-render-layout",
  });
  const trailPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [root.unwrap(trailLayout)],
    label: "typegpu-particle-trail-layout",
  });
  const compositePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [root.unwrap(compositeLayout)],
    label: "typegpu-particle-composite-layout",
  });
  device.pushErrorScope("validation");
  const computePipeline = device.createComputePipeline({
    compute: { entryPoint: "compute_main", module: computeModule },
    label: "typegpu-particle-compute-pipeline",
    layout: computePipelineLayout,
  });
  const particlePipeline = device.createRenderPipeline({
    fragment: {
      entryPoint: "sprite_fragment_main",
      module: particleModule,
      targets: [
        {
          blend: {
            alpha: { dstFactor: "one", operation: "add", srcFactor: "one" },
            color: { dstFactor: "one", operation: "add", srcFactor: "one" },
          },
          format: "rgba8unorm",
        },
      ],
    },
    label: "typegpu-particle-render-pipeline",
    layout: particlePipelineLayout,
    primitive: { topology: "triangle-list" },
    vertex: { entryPoint: "sprite_vertex_main", module: particleModule },
  });
  const pointParticlePipeline = device.createRenderPipeline({
    fragment: {
      entryPoint: "point_fragment_main",
      module: particleModule,
      targets: [
        {
          blend: {
            alpha: { dstFactor: "one", operation: "add", srcFactor: "one" },
            color: { dstFactor: "one", operation: "add", srcFactor: "one" },
          },
          format: "rgba8unorm",
        },
      ],
    },
    label: "typegpu-dense-particle-render-pipeline",
    layout: particlePipelineLayout,
    primitive: { topology: "point-list" },
    vertex: { entryPoint: "point_vertex_main", module: particleModule },
  });
  const fadePipeline = device.createRenderPipeline({
    fragment: {
      entryPoint: "fade_fragment",
      module: fullscreenModule,
      targets: [{ format: "rgba8unorm" }],
    },
    label: "typegpu-particle-trail-fade-pipeline",
    layout: trailPipelineLayout,
    primitive: { topology: "triangle-list" },
    vertex: { entryPoint: "vertex_main", module: fullscreenModule },
  });
  const compositePipeline = device.createRenderPipeline({
    fragment: {
      entryPoint: "composite_fragment",
      module: fullscreenModule,
      targets: [{ format: canvasFormat }],
    },
    label: "typegpu-particle-composite-pipeline",
    layout: compositePipelineLayout,
    primitive: { topology: "triangle-list" },
    vertex: { entryPoint: "vertex_main", module: fullscreenModule },
  });
  const pipelineError = await device.popErrorScope();
  if (pipelineError) {
    destroyParticleChunks();
    uniformBuffer.destroy();
    root.destroy();
    device.destroy();
    throw new Error(
      `TypeGPU pipeline validation failed: ${pipelineError.message}`,
    );
  }

  const computeBindGroups = particleChunks.map((chunk) =>
    root.unwrap(
      root.createBindGroup(computeLayout, {
        chunk: chunk.chunkUniformBuffer,
        frame: uniformBuffer,
        particles: chunk.particleBuffer,
      }),
    ),
  );
  const particleBindGroups = particleChunks.map((chunk) =>
    root.unwrap(
      root.createBindGroup(particleRenderLayout, {
        frame: uniformBuffer,
        particles: chunk.particleBuffer,
      }),
    ),
  );
  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  const context = canvas.getContext("webgpu") as GPUCanvasContext | null;
  if (!context) {
    destroyParticleChunks();
    uniformBuffer.destroy();
    root.destroy();
    device.destroy();
    return null;
  }
  context.configure({ alphaMode: "opaque", device, format: canvasFormat });

  let commandAddress = -1;
  let commandBuffer: ArrayBufferLike | null = null;
  let commandBytes = new Uint8Array();
  let commandWords = new Uint32Array();
  let currentTrailIndex = 0;
  let pointRenderPhase = 0;
  let cssWidth = Math.max(initialWidth, 1);
  let cssHeight = Math.max(initialHeight, 1);
  let requestedPixelRatio = Math.max(initialPixelRatio, 1);
  let destroyed = false;
  let trailTextures: [GPUTexture, GPUTexture] | null = null;
  let trailViews: [GPUTextureView, GPUTextureView] | null = null;
  let fadeBindGroups: [GPUBindGroup, GPUBindGroup] | null = null;
  let compositeBindGroups: [GPUBindGroup, GPUBindGroup] | null = null;

  const clearTrailTextures = () => {
    if (!trailViews) {
      return;
    }

    const encoder = device.createCommandEncoder({
      label: "clear-particle-trails",
    });
    for (const view of trailViews) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            clearValue: BACKGROUND,
            loadOp: "clear",
            storeOp: "store",
            view,
          },
        ],
      });
      pass.end();
    }
    device.queue.submit([encoder.finish()]);
  };

  const recreateTrailTargets = (width: number, height: number) => {
    trailTextures?.[0].destroy();
    trailTextures?.[1].destroy();

    const createTrailTexture = (label: string) =>
      device.createTexture({
        format: "rgba8unorm",
        label,
        size: { height, width },
        usage: TEXTURE_USAGE_TEXTURE_BINDING | TEXTURE_USAGE_RENDER_ATTACHMENT,
      });
    trailTextures = [
      createTrailTexture("particle-trail-a"),
      createTrailTexture("particle-trail-b"),
    ];
    trailViews = [trailTextures[0].createView(), trailTextures[1].createView()];
    fadeBindGroups = trailViews.map((view) =>
      root.unwrap(
        root.createBindGroup(trailLayout, {
          frame: uniformBuffer,
          sampler,
          texture: view,
        }),
      ),
    ) as [GPUBindGroup, GPUBindGroup];
    compositeBindGroups = trailViews.map((view) =>
      root.unwrap(
        root.createBindGroup(compositeLayout, {
          sampler,
          texture: view,
        }),
      ),
    ) as [GPUBindGroup, GPUBindGroup];
    currentTrailIndex = 0;
    clearTrailTextures();
  };

  const resize = (width: number, height: number, pixelRatio: number) => {
    const nextWidth = Math.max(width, 1);
    const nextHeight = Math.max(height, 1);
    const dimensionLimit = device.limits.maxTextureDimension2D;
    requestedPixelRatio = Math.max(pixelRatio, 1);
    const densityPixelRatioLimit =
      activeParticleCount > HIGH_DENSITY_PARTICLE_COUNT ? 1 : 2;
    const limitedPixelRatio = Math.min(
      requestedPixelRatio,
      densityPixelRatioLimit,
      dimensionLimit / nextWidth,
      dimensionLimit / nextHeight,
    );
    const physicalWidth = Math.max(
      1,
      Math.round(nextWidth * limitedPixelRatio),
    );
    const physicalHeight = Math.max(
      1,
      Math.round(nextHeight * limitedPixelRatio),
    );
    const dimensionsChanged =
      nextWidth !== cssWidth || nextHeight !== cssHeight;
    const textureSizeChanged =
      physicalWidth !== canvas.width || physicalHeight !== canvas.height;

    cssWidth = nextWidth;
    cssHeight = nextHeight;
    if (dimensionsChanged) {
      engine.resize_gpu_controller(nextWidth, nextHeight);
    }
    if (textureSizeChanged || !trailTextures) {
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
      recreateTrailTargets(physicalWidth, physicalHeight);
    }
  };

  resize(cssWidth, cssHeight, initialPixelRatio);
  void device.lost.then((info) => {
    if (!destroyed) {
      onDeviceLost(info.message || "The WebGPU device was lost.");
    }
  });

  return {
    destroy() {
      destroyed = true;
      trailTextures?.[0].destroy();
      trailTextures?.[1].destroy();
      destroyParticleChunks();
      uniformBuffer.destroy();
      context.unconfigure?.();
      root.destroy();
      device.destroy();
    },
    kind: "Rust/WASM + WebGPU",
    maxParticleCount,
    render(frame: ParticleFrame) {
      if (destroyed || !trailViews || !fadeBindGroups || !compositeBindGroups) {
        return;
      }

      const nextCommandAddress = engine.prepare_gpu_frame(
        frame.elapsedSeconds,
        frame.deltaSeconds,
        frame.pointerX,
        frame.pointerY,
        frame.interaction,
        frame.simulationSpeed,
      );
      if (
        commandBuffer !== engine.memory.buffer ||
        commandAddress !== nextCommandAddress
      ) {
        commandAddress = nextCommandAddress;
        commandBuffer = engine.memory.buffer;
        commandBytes = new Uint8Array(
          commandBuffer,
          commandAddress,
          UNIFORM_SIZE,
        );
        commandWords = new Uint32Array(
          commandBuffer,
          commandAddress,
          UNIFORM_FLOATS,
        );
      }
      device.queue.writeBuffer(uniformBuffer, 0, commandBytes);

      const nextTrailIndex = 1 - currentTrailIndex;
      const encoder = device.createCommandEncoder({ label: "particle-frame" });
      const computePass = encoder.beginComputePass({
        label: "particle-simulation-pass",
      });
      computePass.setPipeline(computePipeline);
      const commandFlags = commandWords[COMMAND_FLAGS_WORD];
      const activeUpdateLimit = commandWords[ACTIVE_PARTICLE_COUNT_WORD];
      const updateStride = Math.max(
        commandWords[UPDATE_PARTICLE_STRIDE_WORD],
        1,
      );
      const updateOffset = commandWords[UPDATE_PARTICLE_OFFSET_WORD];
      for (const [index, chunk] of particleChunks.entries()) {
        const chunkEnd = chunk.baseParticleIndex + chunk.particleCount;
        const globalLimit =
          commandFlags === 0 ? Math.min(chunkEnd, activeUpdateLimit) : chunkEnd;
        const firstParticleOffset =
          (updateOffset +
            updateStride -
            (chunk.baseParticleIndex % updateStride)) %
          updateStride;
        const firstParticle = chunk.baseParticleIndex + firstParticleOffset;
        if (firstParticle >= globalLimit) {
          continue;
        }
        const updateCount = Math.ceil(
          (globalLimit - firstParticle) / updateStride,
        );
        computePass.setBindGroup(0, computeBindGroups[index]);
        computePass.dispatchWorkgroups(Math.ceil(updateCount / WORKGROUP_SIZE));
      }
      computePass.end();

      const fadePass = encoder.beginRenderPass({
        colorAttachments: [
          {
            clearValue: BACKGROUND,
            loadOp: "clear",
            storeOp: "store",
            view: trailViews[nextTrailIndex],
          },
        ],
        label: "particle-trail-fade-pass",
      });
      fadePass.setPipeline(fadePipeline);
      fadePass.setBindGroup(0, fadeBindGroups[currentTrailIndex]);
      fadePass.draw(3);
      fadePass.end();

      const particlePass = encoder.beginRenderPass({
        colorAttachments: [
          {
            loadOp: "load",
            storeOp: "store",
            view: trailViews[nextTrailIndex],
          },
        ],
        label: "particle-draw-pass",
      });
      if (activeParticleCount > HIGH_DENSITY_PARTICLE_COUNT) {
        particlePass.setPipeline(pointParticlePipeline);
        const renderCohortCount = Math.ceil(
          activeParticleCount / MAX_POINT_PARTICLES_PER_FRAME,
        );
        const renderCohortSize = Math.ceil(
          activeParticleCount / renderCohortCount,
        );
        const firstParticle = pointRenderPhase * renderCohortSize;
        const renderedParticleCount = Math.min(
          renderCohortSize,
          activeParticleCount - firstParticle,
        );
        const lastParticle = firstParticle + renderedParticleCount;
        for (const [index, chunk] of particleChunks.entries()) {
          const chunkEnd = Math.min(
            chunk.baseParticleIndex + chunk.particleCount,
            activeParticleCount,
          );
          const overlapStart = Math.max(firstParticle, chunk.baseParticleIndex);
          const overlapEnd = Math.min(lastParticle, chunkEnd);
          if (overlapStart >= overlapEnd) {
            continue;
          }
          particlePass.setBindGroup(0, particleBindGroups[index]);
          particlePass.draw(
            1,
            overlapEnd - overlapStart,
            0,
            overlapStart - chunk.baseParticleIndex,
          );
        }
        pointRenderPhase = (pointRenderPhase + 1) % renderCohortCount;
      } else {
        particlePass.setPipeline(particlePipeline);
        for (const [index, chunk] of particleChunks.entries()) {
          const particleCount = Math.min(
            chunk.particleCount,
            Math.max(activeParticleCount - chunk.baseParticleIndex, 0),
          );
          if (particleCount === 0) {
            continue;
          }
          particlePass.setBindGroup(0, particleBindGroups[index]);
          particlePass.draw(3, particleCount);
        }
      }
      particlePass.end();

      const compositePass = encoder.beginRenderPass({
        colorAttachments: [
          {
            clearValue: BACKGROUND,
            loadOp: "clear",
            storeOp: "store",
            view: context.getCurrentTexture().createView(),
          },
        ],
        label: "particle-composite-pass",
      });
      compositePass.setPipeline(compositePipeline);
      compositePass.setBindGroup(0, compositeBindGroups[nextTrailIndex]);
      compositePass.draw(3);
      compositePass.end();

      device.queue.submit([encoder.finish()]);
      currentTrailIndex = nextTrailIndex;
    },
    resize,
    setParticleCount(count: number) {
      activeParticleCount = engine.set_gpu_particle_count(Math.round(count));
      pointRenderPhase = 0;
      resize(cssWidth, cssHeight, requestedPixelRatio);
      return activeParticleCount;
    },
  };
}
