import { d, std, tgpu } from "typegpu";

export const Particle = d.struct({
  position: d.vec2f,
  velocity: d.vec2f,
});

export const FrameUniforms = d.struct({
  dimensions: d.vec2f,
  previousDimensions: d.vec2f,
  pointer: d.vec2f,
  flowPhaseX: d.f32,
  flowPhaseY: d.f32,
  simulationDeltaSeconds: d.f32,
  interaction: d.f32,
  activeParticleCount: d.u32,
  updateParticleCount: d.u32,
  trailAlpha: d.f32,
  commandFlags: d.u32,
  updateParticleStride: d.u32,
  updateParticleOffset: d.u32,
});

export const ParticleChunk = d.struct({
  baseParticleIndex: d.u32,
  particleCount: d.u32,
  padding0: d.u32,
  padding1: d.u32,
});

export const computeLayout = tgpu
  .bindGroupLayout({
    particles: {
      access: "mutable",
      storage: d.arrayOf(Particle),
      visibility: ["compute"],
    },
    chunk: { uniform: ParticleChunk, visibility: ["compute"] },
    frame: { uniform: FrameUniforms, visibility: ["compute"] },
  })
  .$idx(0);

export const particleRenderLayout = tgpu
  .bindGroupLayout({
    particles: {
      access: "readonly",
      storage: d.arrayOf(Particle),
      visibility: ["vertex"],
    },
    frame: {
      uniform: FrameUniforms,
      visibility: ["fragment", "vertex"],
    },
  })
  .$idx(0);

export const trailLayout = tgpu
  .bindGroupLayout({
    sampler: { sampler: "filtering", visibility: ["fragment"] },
    texture: { texture: d.texture2d(d.f32), visibility: ["fragment"] },
    frame: { uniform: FrameUniforms, visibility: ["fragment"] },
  })
  .$idx(0);

export const compositeLayout = tgpu
  .bindGroupLayout({
    sampler: { sampler: "filtering", visibility: ["fragment"] },
    texture: { texture: d.texture2d(d.f32), visibility: ["fragment"] },
  })
  .$idx(0);

export const WORKGROUP_SIZE = 256;

const COMMAND_FLAG_INITIALIZE = d.u32(1);
const COMMAND_FLAG_RESIZE = d.u32(1 << 1);
const MAX_POINT_PARTICLES_PER_FRAME = d.u32(1_050_000);

const hashU32 = (input: number) => {
  "use gpu";
  let value = input;
  value ^= value >>> d.u32(16);
  value *= d.u32(0x7feb_352d);
  value ^= value >>> d.u32(15);
  value *= d.u32(0x846c_a68b);
  value ^= value >>> d.u32(16);
  return value;
};

const random = (index: number, stream: number) => {
  "use gpu";
  const mixed = index ^ (stream * d.u32(0x9e37_79b9)) ^ d.u32(0x5eed_1234);
  return d.f32(hashU32(mixed)) / 4_294_967_295;
};

const wrapCoordinate = (coordinate: number, dimension: number) => {
  "use gpu";
  const lowerBound = d.f32(-4);
  const upperBound = dimension + d.f32(4);
  if (coordinate >= lowerBound && coordinate <= upperBound) {
    return coordinate;
  }

  const span = upperBound - lowerBound;
  const offset = coordinate - lowerBound;
  return lowerBound + offset - std.floor(offset / span) * span;
};

export const computeMain = tgpu
  .computeFn({
    in: { globalId: d.builtin.globalInvocationId },
    workgroupSize: [WORKGROUP_SIZE],
  })(({ globalId }) => {
    "use gpu";
    const frame = computeLayout.$.frame;
    const chunk = computeLayout.$.chunk;
    const stride = frame.updateParticleStride;
    const chunkRemainder = chunk.baseParticleIndex % stride;
    const firstParticleOffset =
      (frame.updateParticleOffset + stride - chunkRemainder) % stride;
    const globalIndex =
      chunk.baseParticleIndex + firstParticleOffset + globalId.x * stride;
    let globalLimit = std.min(
      chunk.baseParticleIndex + chunk.particleCount,
      frame.activeParticleCount,
    );
    if (frame.commandFlags !== d.u32(0)) {
      globalLimit = chunk.baseParticleIndex + chunk.particleCount;
    }
    if (globalIndex >= globalLimit) {
      return;
    }

    const index = globalIndex - chunk.baseParticleIndex;
    const particle = Particle(computeLayout.$.particles[index]);

    if ((frame.commandFlags & COMMAND_FLAG_INITIALIZE) !== d.u32(0)) {
      particle.position = d.vec2f(
        random(globalIndex, d.u32(0)) * frame.dimensions.x,
        random(globalIndex, d.u32(1)) * frame.dimensions.y,
      );
      particle.velocity = d.vec2f(
        (random(globalIndex, d.u32(2)) - 0.5) * 18.0,
        (random(globalIndex, d.u32(3)) - 0.5) * 18.0,
      );
    } else if ((frame.commandFlags & COMMAND_FLAG_RESIZE) !== d.u32(0)) {
      particle.position = particle.position.mul(
        frame.dimensions.div(std.max(frame.previousDimensions, d.vec2f(1.0))),
      );
    }

    const delta =
      frame.simulationDeltaSeconds * d.f32(frame.updateParticleStride);
    const damping = std.pow(0.992, delta * 60.0);
    const phase = random(globalIndex, d.u32(4)) * 6.28318530718;
    const flowX = std.sin(
      particle.position.y * 0.009 + frame.flowPhaseX + phase,
    );
    const flowY = std.cos(
      particle.position.x * 0.007 - frame.flowPhaseY + phase,
    );

    particle.velocity.x += flowX * delta * 24.0;
    particle.velocity.y += flowY * delta * 24.0;

    const pointerOffset = frame.pointer.sub(particle.position);
    const distanceSquared = std.dot(pointerOffset, pointerOffset);
    if (distanceSquared < 32_400.0 && distanceSquared > 9.0) {
      const force = (frame.interaction * delta * 1_900.0) / distanceSquared;
      particle.velocity = particle.velocity.add(pointerOffset.mul(force));
    }

    particle.velocity = particle.velocity.mul(damping);
    particle.position = particle.position.add(particle.velocity.mul(delta));
    particle.position.x = wrapCoordinate(
      particle.position.x,
      frame.dimensions.x,
    );
    particle.position.y = wrapCoordinate(
      particle.position.y,
      frame.dimensions.y,
    );

    computeLayout.$.particles[index] = Particle(particle);
  })
  .$name("compute_main");

const clipPosition = (cssPosition: d.v2f) => {
  "use gpu";
  const dimensions = particleRenderLayout.$.frame.dimensions;
  return d.vec2f(
    (cssPosition.x / dimensions.x) * 2.0 - 1.0,
    1.0 - (cssPosition.y / dimensions.y) * 2.0,
  );
};

const particleOpacity = (velocity: d.v2f) => {
  "use gpu";
  return std.clamp(std.length(velocity) * 0.04, 0.18, 1.0);
};

const densityScale = () => {
  "use gpu";
  const particleCount = d.f32(particleRenderLayout.$.frame.activeParticleCount);
  return std.clamp(std.sqrt(2_400.0 / std.max(particleCount, 1.0)), 0.03, 1.0);
};

const spriteVarying = {
  position: d.builtin.position,
  localPosition: d.vec2f,
  opacity: d.f32,
};

export const spriteVertexMain = tgpu
  .vertexFn({
    in: {
      instanceIndex: d.builtin.instanceIndex,
      vertexIndex: d.builtin.vertexIndex,
    },
    out: spriteVarying,
  })(({ instanceIndex, vertexIndex }) => {
    "use gpu";
    const corners = [
      d.vec2f(-1.7320508, -1.0),
      d.vec2f(1.7320508, -1.0),
      d.vec2f(0.0, 2.0),
    ];
    const particle = particleRenderLayout.$.particles[instanceIndex];
    const corner = corners[vertexIndex];
    const particleSpeed = std.length(particle.velocity);
    const particleSize = std.clamp(0.7 + particleSpeed * 0.035, 0.7, 2.6);
    const cssPosition = particle.position.add(corner.mul(particleSize * 0.5));

    return {
      position: d.vec4f(clipPosition(cssPosition), 0.0, 1.0),
      localPosition: corner,
      opacity: particleOpacity(particle.velocity),
    };
  })
  .$name("sprite_vertex_main");

export const spriteFragmentMain = tgpu
  .fragmentFn({
    in: {
      localPosition: d.vec2f,
      opacity: d.f32,
    },
    out: d.vec4f,
  })(({ localPosition, opacity }) => {
    "use gpu";
    const radialDistance = std.length(localPosition);
    const coverage = 1.0 - std.smoothstep(0.55, 1.0, radialDistance);
    const intensity = coverage * opacity * densityScale() * 0.72;
    return d.vec4f(d.vec3f(0.36, 0.81, 1.0).mul(intensity), intensity);
  })
  .$name("sprite_fragment_main");

const pointVarying = {
  position: d.builtin.position,
  opacity: d.f32,
};

export const pointVertexMain = tgpu
  .vertexFn({
    in: { instanceIndex: d.builtin.instanceIndex },
    out: pointVarying,
  })(({ instanceIndex }) => {
    "use gpu";
    const particle = particleRenderLayout.$.particles[instanceIndex];
    return {
      position: d.vec4f(clipPosition(particle.position), 0.0, 1.0),
      opacity: particleOpacity(particle.velocity),
    };
  })
  .$name("point_vertex_main");

export const pointFragmentMain = tgpu
  .fragmentFn({ in: { opacity: d.f32 }, out: d.vec4f })(({ opacity }) => {
    "use gpu";
    const frame = particleRenderLayout.$.frame;
    const renderCohortBoost = std.max(
      std.ceil(
        d.f32(frame.activeParticleCount) / d.f32(MAX_POINT_PARTICLES_PER_FRAME),
      ),
      1.0,
    );
    const intensity = opacity * densityScale() * 1.6 * renderCohortBoost;
    return d.vec4f(d.vec3f(0.36, 0.81, 1.0).mul(intensity), intensity);
  })
  .$name("point_fragment_main");

const fullscreenVarying = {
  position: d.builtin.position,
  uv: d.vec2f,
};

export const fullscreenVertexMain = tgpu
  .vertexFn({
    in: { vertexIndex: d.builtin.vertexIndex },
    out: fullscreenVarying,
  })(({ vertexIndex }) => {
    "use gpu";
    const positions = [
      d.vec2f(-1.0, -1.0),
      d.vec2f(3.0, -1.0),
      d.vec2f(-1.0, 3.0),
    ];
    const position = positions[vertexIndex];
    return {
      position: d.vec4f(position, 0.0, 1.0),
      uv: d.vec2f(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5),
    };
  })
  .$name("vertex_main");

export const fadeFragment = tgpu
  .fragmentFn({ in: { uv: d.vec2f }, out: d.vec4f })(({ uv }) => {
    "use gpu";
    const previous = std.textureSample(
      trailLayout.$.texture,
      trailLayout.$.sampler,
      uv,
    ).rgb;
    const background = d.vec3f(5 / 255, 7 / 255, 13 / 255);
    return d.vec4f(
      std.mix(previous, background, trailLayout.$.frame.trailAlpha),
      1.0,
    );
  })
  .$name("fade_fragment");

export const compositeFragment = tgpu
  .fragmentFn({ in: { uv: d.vec2f }, out: d.vec4f })(({ uv }) => {
    "use gpu";
    const color = std.textureSample(
      compositeLayout.$.texture,
      compositeLayout.$.sampler,
      uv,
    ).rgb;
    return d.vec4f(color, 1.0);
  })
  .$name("composite_fragment");

export const shaderSource = {
  compute: () => tgpu.resolve([computeMain]),
  fullscreen: () =>
    tgpu.resolve([fullscreenVertexMain, fadeFragment, compositeFragment]),
  particles: () =>
    tgpu.resolve([
      spriteVertexMain,
      spriteFragmentMain,
      pointVertexMain,
      pointFragmentMain,
    ]),
};
