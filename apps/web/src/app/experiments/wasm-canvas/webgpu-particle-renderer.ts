import type { ParticleFrame, ParticleRenderer } from "./particle-renderer";
import { loadParticleEngine } from "./wasm-engine";

type GpuAdapter = {
  requestDevice: () => Promise<GpuDevice>;
};

type GpuApi = {
  getPreferredCanvasFormat: () => string;
  requestAdapter: (options?: object) => Promise<GpuAdapter | null>;
};

type GpuBindGroup = object;
type GpuBuffer = { destroy: () => void };
type GpuCommandBuffer = object;
type GpuComputePipeline = {
  getBindGroupLayout: (index: number) => object;
};
type GpuRenderPipeline = {
  getBindGroupLayout: (index: number) => object;
};
type GpuSampler = object;
type GpuTextureView = object;

type GpuShaderModule = {
  getCompilationInfo?: () => Promise<{
    messages: Array<{
      lineNum: number;
      linePos: number;
      message: string;
      type: string;
    }>;
  }>;
};

type GpuTexture = {
  createView: () => GpuTextureView;
  destroy: () => void;
};

type GpuComputePass = {
  dispatchWorkgroups: (count: number) => void;
  end: () => void;
  setBindGroup: (index: number, bindGroup: GpuBindGroup) => void;
  setPipeline: (pipeline: GpuComputePipeline) => void;
};

type GpuRenderPass = {
  draw: (
    vertexCount: number,
    instanceCount?: number,
    firstVertex?: number,
    firstInstance?: number,
  ) => void;
  end: () => void;
  setBindGroup: (index: number, bindGroup: GpuBindGroup) => void;
  setPipeline: (pipeline: GpuRenderPipeline) => void;
};

type GpuCommandEncoder = {
  beginComputePass: (descriptor?: object) => GpuComputePass;
  beginRenderPass: (descriptor: object) => GpuRenderPass;
  finish: () => GpuCommandBuffer;
};

type GpuDevice = {
  createBindGroup: (descriptor: object) => GpuBindGroup;
  createBuffer: (descriptor: object) => GpuBuffer;
  createCommandEncoder: (descriptor?: object) => GpuCommandEncoder;
  createComputePipeline: (descriptor: object) => GpuComputePipeline;
  createRenderPipeline: (descriptor: object) => GpuRenderPipeline;
  createSampler: (descriptor?: object) => GpuSampler;
  createShaderModule: (descriptor: object) => GpuShaderModule;
  createTexture: (descriptor: object) => GpuTexture;
  destroy: () => void;
  limits: {
    maxComputeWorkgroupsPerDimension: number;
    maxStorageBufferBindingSize: number;
    maxTextureDimension2D: number;
  };
  lost: Promise<{ message: string }>;
  popErrorScope: () => Promise<{ message: string } | null>;
  pushErrorScope: (filter: string) => void;
  queue: {
    submit: (commandBuffers: GpuCommandBuffer[]) => void;
    writeBuffer: (
      buffer: GpuBuffer,
      bufferOffset: number,
      data: ArrayBufferView,
    ) => void;
  };
};

type GpuCanvasContext = {
  configure: (descriptor: object) => void;
  getCurrentTexture: () => GpuTexture;
  unconfigure?: () => void;
};

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
const COMMAND_FLAG_INITIALIZE = 1;
const COMMAND_FLAG_RESIZE = 1 << 1;
const HIGH_DENSITY_PARTICLE_COUNT = 450_000;
const MAX_GPU_PARTICLE_COUNT = 4_200_000;
const MAX_POINT_PARTICLES_PER_FRAME = 1_050_000;
const PARTICLE_STRIDE = 4 * Float32Array.BYTES_PER_ELEMENT;
const UNIFORM_FLOATS = 16;
const UNIFORM_SIZE = UNIFORM_FLOATS * Float32Array.BYTES_PER_ELEMENT;
const UPDATE_PARTICLE_COUNT_WORD = 11;
const WORKGROUP_SIZE = 256;

const COMPUTE_SHADER = /* wgsl */ `
struct Particle {
  position: vec2<f32>,
  velocity: vec2<f32>,
}

struct FrameUniforms {
  dimensions: vec2<f32>,
  previous_dimensions: vec2<f32>,
  pointer: vec2<f32>,
  flow_phase_x: f32,
  flow_phase_y: f32,
  simulation_delta_seconds: f32,
  interaction: f32,
  active_particle_count: u32,
  update_particle_count: u32,
  trail_alpha: f32,
  command_flags: u32,
  update_particle_stride: u32,
  update_particle_offset: u32,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> frame: FrameUniforms;

fn hash_u32(input: u32) -> u32 {
  var value = input;
  value ^= value >> 16u;
  value *= 0x7feb352du;
  value ^= value >> 15u;
  value *= 0x846ca68bu;
  value ^= value >> 16u;
  return value;
}

fn random(index: u32, stream: u32) -> f32 {
  let mixed = index ^ (stream * 0x9e3779b9u) ^ 0x5eed1234u;
  return f32(hash_u32(mixed)) / 4294967295.0;
}

fn wrap_coordinate(coordinate: f32, dimension: f32) -> f32 {
  let lower_bound = -4.0;
  let upper_bound = dimension + 4.0;
  if (coordinate >= lower_bound && coordinate <= upper_bound) {
    return coordinate;
  }

  let span = upper_bound - lower_bound;
  let offset = coordinate - lower_bound;
  return lower_bound + offset - floor(offset / span) * span;
}

@compute @workgroup_size(${WORKGROUP_SIZE})
fn compute_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let invocation_index = global_id.x;
  if (invocation_index >= frame.update_particle_count) {
    return;
  }
  let index = invocation_index * frame.update_particle_stride + frame.update_particle_offset;

  var particle = particles[index];
  if ((frame.command_flags & ${COMMAND_FLAG_INITIALIZE}u) != 0u) {
    particle.position = vec2<f32>(
      random(index, 0u) * frame.dimensions.x,
      random(index, 1u) * frame.dimensions.y,
    );
    particle.velocity = vec2<f32>(
      (random(index, 2u) - 0.5) * 18.0,
      (random(index, 3u) - 0.5) * 18.0,
    );
  } else if ((frame.command_flags & ${COMMAND_FLAG_RESIZE}u) != 0u) {
    particle.position *= frame.dimensions / max(frame.previous_dimensions, vec2<f32>(1.0));
  }

  let delta = frame.simulation_delta_seconds * f32(frame.update_particle_stride);
  let damping = pow(0.992, delta * 60.0);
  let phase = random(index, 4u) * 6.28318530718;
  let flow_x = sin(
    particle.position.y * 0.009 +
    frame.flow_phase_x +
    phase
  );
  let flow_y = cos(
    particle.position.x * 0.007 -
    frame.flow_phase_y +
    phase
  );

  particle.velocity.x += flow_x * delta * 24.0;
  particle.velocity.y += flow_y * delta * 24.0;

  let pointer_offset = frame.pointer - particle.position;
  let distance_squared = dot(pointer_offset, pointer_offset);
  if (distance_squared < 32400.0 && distance_squared > 9.0) {
    let force = frame.interaction * delta * 1900.0 / distance_squared;
    particle.velocity += pointer_offset * force;
  }

  particle.velocity *= damping;
  particle.position += particle.velocity * delta;

  particle.position.x = wrap_coordinate(particle.position.x, frame.dimensions.x);
  particle.position.y = wrap_coordinate(particle.position.y, frame.dimensions.y);

  particles[index] = particle;
}
`;

const PARTICLE_SHADER = /* wgsl */ `
struct Particle {
  position: vec2<f32>,
  velocity: vec2<f32>,
}

struct FrameUniforms {
  dimensions: vec2<f32>,
  previous_dimensions: vec2<f32>,
  pointer: vec2<f32>,
  flow_phase_x: f32,
  flow_phase_y: f32,
  simulation_delta_seconds: f32,
  interaction: f32,
  active_particle_count: u32,
  update_particle_count: u32,
  trail_alpha: f32,
  command_flags: u32,
  update_particle_stride: u32,
  update_particle_offset: u32,
}

struct SpriteVertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) local_position: vec2<f32>,
  @location(1) opacity: f32,
}

struct PointVertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) opacity: f32,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> frame: FrameUniforms;

fn clip_position(css_position: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(
    css_position.x / frame.dimensions.x * 2.0 - 1.0,
    1.0 - css_position.y / frame.dimensions.y * 2.0,
  );
}

fn particle_opacity(velocity: vec2<f32>) -> f32 {
  return clamp(length(velocity) * 0.04, 0.18, 1.0);
}

fn density_scale() -> f32 {
  return clamp(
    sqrt(2400.0 / max(f32(frame.active_particle_count), 1.0)),
    0.03,
    1.0,
  );
}

@vertex
fn sprite_vertex_main(
  @builtin(vertex_index) vertex_index: u32,
  @builtin(instance_index) instance_index: u32,
) -> SpriteVertexOutput {
  let corners = array<vec2<f32>, 3>(
    vec2<f32>(-1.7320508, -1.0),
    vec2<f32>(1.7320508, -1.0),
    vec2<f32>(0.0, 2.0),
  );
  let particle = particles[instance_index];
  let corner = corners[vertex_index];
  let particle_speed = length(particle.velocity);
  let particle_size = clamp(0.7 + particle_speed * 0.035, 0.7, 2.6);
  let css_position = particle.position + corner * particle_size * 0.5;

  var output: SpriteVertexOutput;
  output.position = vec4<f32>(clip_position(css_position), 0.0, 1.0);
  output.local_position = corner;
  output.opacity = particle_opacity(particle.velocity);
  return output;
}

@fragment
fn sprite_fragment_main(input: SpriteVertexOutput) -> @location(0) vec4<f32> {
  let radial_distance = length(input.local_position);
  let coverage = 1.0 - smoothstep(0.55, 1.0, radial_distance);
  let intensity = coverage * input.opacity * density_scale() * 0.72;
  return vec4<f32>(vec3<f32>(0.36, 0.81, 1.0) * intensity, intensity);
}

@vertex
fn point_vertex_main(
  @builtin(instance_index) instance_index: u32,
) -> PointVertexOutput {
  let particle = particles[instance_index];

  var output: PointVertexOutput;
  output.position = vec4<f32>(clip_position(particle.position), 0.0, 1.0);
  output.opacity = particle_opacity(particle.velocity);
  return output;
}

@fragment
fn point_fragment_main(input: PointVertexOutput) -> @location(0) vec4<f32> {
  let render_cohort_boost = max(
    ceil(
      f32(frame.active_particle_count) /
      f32(${MAX_POINT_PARTICLES_PER_FRAME}u),
    ),
    1.0,
  );
  let intensity = input.opacity * density_scale() * 1.6 * render_cohort_boost;
  return vec4<f32>(vec3<f32>(0.36, 0.81, 1.0) * intensity, intensity);
}
`;

const FULLSCREEN_SHADER = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

struct FrameUniforms {
  dimensions: vec2<f32>,
  previous_dimensions: vec2<f32>,
  pointer: vec2<f32>,
  flow_phase_x: f32,
  flow_phase_y: f32,
  simulation_delta_seconds: f32,
  interaction: f32,
  active_particle_count: u32,
  update_particle_count: u32,
  trail_alpha: f32,
  command_flags: u32,
  update_particle_stride: u32,
  update_particle_offset: u32,
}

@group(0) @binding(0) var trail_sampler: sampler;
@group(0) @binding(1) var trail_texture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> frame: FrameUniforms;

@vertex
fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
  let positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0),
  );
  let position = positions[vertex_index];

  var output: VertexOutput;
  output.position = vec4<f32>(position, 0.0, 1.0);
  output.uv = vec2<f32>(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
  return output;
}

@fragment
fn fade_fragment(input: VertexOutput) -> @location(0) vec4<f32> {
  let previous = textureSample(trail_texture, trail_sampler, input.uv).rgb;
  let background = vec3<f32>(${BACKGROUND.r}, ${BACKGROUND.g}, ${BACKGROUND.b});
  return vec4<f32>(mix(previous, background, frame.trail_alpha), 1.0);
}

@fragment
fn composite_fragment(input: VertexOutput) -> @location(0) vec4<f32> {
  return vec4<f32>(textureSample(trail_texture, trail_sampler, input.uv).rgb, 1.0);
}
`;

function getGpuApi(): GpuApi | null {
  return (navigator as Navigator & { gpu?: GpuApi }).gpu ?? null;
}

async function assertShaderCompiled(
  shaderModule: GpuShaderModule,
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

export async function createWebGpuParticleRenderer(
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

  const device = await adapter.requestDevice();
  if (signal.aborted) {
    device.destroy();
    throw new DOMException("The renderer load was aborted.", "AbortError");
  }

  let engine: Awaited<ReturnType<typeof loadParticleEngine>>;
  try {
    engine = await loadParticleEngine(signal);
  } catch (error) {
    device.destroy();
    throw error;
  }

  const maxParticleCount = Math.max(
    1,
    Math.min(
      MAX_GPU_PARTICLE_COUNT,
      Math.floor(device.limits.maxStorageBufferBindingSize / PARTICLE_STRIDE),
      device.limits.maxComputeWorkgroupsPerDimension * WORKGROUP_SIZE,
    ),
  );
  if (engine.gpu_frame_command_byte_length() !== UNIFORM_SIZE) {
    device.destroy();
    throw new Error("The Rust/WASM and WebGPU frame command layouts differ.");
  }
  let activeParticleCount = engine.initialize_gpu_controller(
    maxParticleCount,
    initialParticleCount,
    Math.max(initialWidth, 1),
    Math.max(initialHeight, 1),
  );
  const particleBuffer = device.createBuffer({
    label: "particle-state",
    size: maxParticleCount * PARTICLE_STRIDE,
    usage: BUFFER_USAGE_STORAGE,
  });
  const uniformBuffer = device.createBuffer({
    label: "particle-frame-uniforms",
    size: UNIFORM_SIZE,
    usage: BUFFER_USAGE_UNIFORM | BUFFER_USAGE_COPY_DST,
  });

  const computeModule = device.createShaderModule({
    code: COMPUTE_SHADER,
    label: "particle-compute-shader",
  });
  const particleModule = device.createShaderModule({
    code: PARTICLE_SHADER,
    label: "particle-render-shader",
  });
  const fullscreenModule = device.createShaderModule({
    code: FULLSCREEN_SHADER,
    label: "particle-trail-shader",
  });
  await Promise.all([
    assertShaderCompiled(computeModule, "Particle compute shader"),
    assertShaderCompiled(particleModule, "Particle render shader"),
    assertShaderCompiled(fullscreenModule, "Particle trail shader"),
  ]);

  const canvasFormat = gpu.getPreferredCanvasFormat();
  device.pushErrorScope("validation");
  const computePipeline = device.createComputePipeline({
    compute: { entryPoint: "compute_main", module: computeModule },
    label: "particle-compute-pipeline",
    layout: "auto",
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
    label: "particle-render-pipeline",
    layout: "auto",
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
    label: "dense-particle-render-pipeline",
    layout: "auto",
    primitive: { topology: "point-list" },
    vertex: { entryPoint: "point_vertex_main", module: particleModule },
  });
  const fadePipeline = device.createRenderPipeline({
    fragment: {
      entryPoint: "fade_fragment",
      module: fullscreenModule,
      targets: [{ format: "rgba8unorm" }],
    },
    label: "particle-trail-fade-pipeline",
    layout: "auto",
    primitive: { topology: "triangle-list" },
    vertex: { entryPoint: "vertex_main", module: fullscreenModule },
  });
  const compositePipeline = device.createRenderPipeline({
    fragment: {
      entryPoint: "composite_fragment",
      module: fullscreenModule,
      targets: [{ format: canvasFormat }],
    },
    label: "particle-composite-pipeline",
    layout: "auto",
    primitive: { topology: "triangle-list" },
    vertex: { entryPoint: "vertex_main", module: fullscreenModule },
  });
  const pipelineError = await device.popErrorScope();
  if (pipelineError) {
    particleBuffer.destroy();
    uniformBuffer.destroy();
    device.destroy();
    throw new Error(
      `WebGPU pipeline validation failed: ${pipelineError.message}`,
    );
  }

  const computeBindGroup = device.createBindGroup({
    entries: [
      { binding: 0, resource: { buffer: particleBuffer } },
      { binding: 1, resource: { buffer: uniformBuffer } },
    ],
    label: "particle-compute-bind-group",
    layout: computePipeline.getBindGroupLayout(0),
  });
  const particleBindGroup = device.createBindGroup({
    entries: [
      { binding: 0, resource: { buffer: particleBuffer } },
      { binding: 1, resource: { buffer: uniformBuffer } },
    ],
    label: "particle-render-bind-group",
    layout: particlePipeline.getBindGroupLayout(0),
  });
  const pointParticleBindGroup = device.createBindGroup({
    entries: [
      { binding: 0, resource: { buffer: particleBuffer } },
      { binding: 1, resource: { buffer: uniformBuffer } },
    ],
    label: "dense-particle-render-bind-group",
    layout: pointParticlePipeline.getBindGroupLayout(0),
  });
  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  const context = canvas.getContext(
    "webgpu",
  ) as unknown as GpuCanvasContext | null;
  if (!context) {
    particleBuffer.destroy();
    uniformBuffer.destroy();
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
  let trailTextures: [GpuTexture, GpuTexture] | null = null;
  let trailViews: [GpuTextureView, GpuTextureView] | null = null;
  let fadeBindGroups: [GpuBindGroup, GpuBindGroup] | null = null;
  let compositeBindGroups: [GpuBindGroup, GpuBindGroup] | null = null;

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
    fadeBindGroups = [0, 1].map((index) =>
      device.createBindGroup({
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: trailViews?.[index] },
          { binding: 2, resource: { buffer: uniformBuffer } },
        ],
        label: `particle-fade-bind-group-${index}`,
        layout: fadePipeline.getBindGroupLayout(0),
      }),
    ) as [GpuBindGroup, GpuBindGroup];
    compositeBindGroups = [0, 1].map((index) =>
      device.createBindGroup({
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: trailViews?.[index] },
        ],
        label: `particle-composite-bind-group-${index}`,
        layout: compositePipeline.getBindGroupLayout(0),
      }),
    ) as [GpuBindGroup, GpuBindGroup];
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
      particleBuffer.destroy();
      uniformBuffer.destroy();
      context.unconfigure?.();
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
      computePass.setBindGroup(0, computeBindGroup);
      const updateCount = commandWords[UPDATE_PARTICLE_COUNT_WORD];
      computePass.dispatchWorkgroups(Math.ceil(updateCount / WORKGROUP_SIZE));
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
        particlePass.setBindGroup(0, pointParticleBindGroup);
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
        particlePass.draw(1, renderedParticleCount, 0, firstParticle);
        pointRenderPhase = (pointRenderPhase + 1) % renderCohortCount;
      } else {
        particlePass.setPipeline(particlePipeline);
        particlePass.setBindGroup(0, particleBindGroup);
        particlePass.draw(3, activeParticleCount);
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
