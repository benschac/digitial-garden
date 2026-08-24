---
title: "How Rust, WebAssembly, and WebGPU Pushed a Particle Field to 4.2 Million"
slug: "rust-wasm-webgpu-particles"
summary: "The complete path from a Rust/WASM Canvas prototype to a time-based WebGPU simulation holding 4.2 million GPU-resident particles."
publishedAt: "2026-08-23"
status: "published"
tags:
  - "Rust"
  - "WebAssembly"
  - "WebGPU"
  - "performance"
featured: false
---

I started with a small particle experiment powered by Rust and WebAssembly. Rust simulated the particles, WebAssembly exposed the results to the browser, and Canvas 2D drew them.

That architecture was useful, but it had a hard scaling problem: every frame, every particle had to cross from CPU-owned memory into browser drawing commands. Making the Rust computation faster did not remove the cost of transferring and drawing the result.

The current version takes a different approach. Rust still decides what a frame should do, but WebGPU owns the particle data, simulation, trails, and rendering. That shift let the experiment move from a few thousand CPU-rendered particles to a field containing 4.2 million GPU-resident particles.

[Open the live particle experiment](/experiments/wasm-canvas).

## The important distinction

WebAssembly and WebGPU are not competing rendering technologies.

- Rust/WASM is good at application logic, validation, control policy, and compact state transitions.
- WebGPU is the browser API that creates GPU buffers, pipelines, textures, and command passes.
- WGSL shaders are small programs that run inside those WebGPU pipelines.

In this experiment, Rust/WASM is the control plane and the shaders are the data plane.

React collects the particle count, pointer position, gravity, simulation speed, dimensions, and timing. Rust turns those values into one 64-byte frame command. JavaScript uploads that command to a WebGPU uniform buffer, then submits the GPU passes.

The flow for one frame is:

1. React and browser events update a small set of controls.
2. Rust/WASM validates timing and decides how much work should happen.
3. JavaScript uploads the 64-byte command.
4. A compute shader advances particle positions and velocities in a GPU storage buffer.
5. A render shader reads that same storage buffer directly.
6. Two alternating textures fade and retain the particle trails.
7. WebGPU composites the finished texture into the canvas.

The full particle array never comes back to JavaScript or WASM.

## The complete path to 4.2 million

In condensed form, this was the full progression:

1. Start with a dependency-free Rust/WASM simulation and Canvas 2D renderer to establish the motion, pointer interaction, resizing, and fallback behavior.
2. Identify the real scaling boundary: Rust could update particles quickly, but copying every result into browser drawing commands still cost CPU time proportional to particle count.
3. Keep Rust as the control plane, but move particle position, velocity, simulation, and rendering into WebGPU storage buffers and shaders.
4. Replace the per-particle WASM output with a fixed 64-byte frame command containing only timing, dimensions, controls, command flags, and cohort policy.
5. Initialize deterministic particle state directly in the compute shader, so JavaScript never has to build or upload a multi-million-particle array.
6. Keep animation time-based: clamp bad frame gaps, scale simulation time separately from trail decay, pause when hidden, reset timing on resume, and honor reduced-motion preferences.
7. Reproduce the original physics on the GPU: a trigonometric flow field, pointer attraction or repulsion, frame-rate-independent damping, position integration, resize scaling, and padded boundary wrapping.
8. Build persistent trails with two ping-pong textures and three render passes: fade the previous trail, add the current particle cohort, then composite the result to the canvas.
9. Cut particle state from 32 bytes to 16 by storing only position and velocity and deriving phase, size, and opacity in shaders.
10. Replace six-vertex quads with one triangle at normal density and one-pixel point primitives above 450,000 particles.
11. Cap the high-density render target at 1x pixel density instead of paying Retina-scale full-screen texture costs.
12. Add rotating simulation cohorts: two above 450,000, four above 1.2 million, and eight above 2.4 million.
13. Multiply each cohort's time step by its stride so particles still advance through the intended amount of simulation time.
14. Cap drawing at 1.05 million points per frame, rotating through two render cohorts at 2.1 million and four at 4.2 million.
15. Scale point contribution with the render-cohort count so adding more temporal cohorts does not make the accumulated field look proportionally dimmer.
16. Fix boundary wrapping so particles preserve their overshoot instead of snapping onto identical edge coordinates and creating bright bands.
17. Raise the TypeScript, UI, and Rust ceilings together, while still clamping the exposed slider to the current WebGPU device's storage-buffer and workgroup limits.
18. Rebuild the release WASM artifact, run Rust and browser-side policy tests, compile every shader with validation enabled, build the production site, and stress-test the live 4.2-million-particle path at both 2.5x and 8x speed.

## Where the WASM-to-shader boundary lives

The boundary is the frame command.

Rust does not send millions of particle positions. It sends a fixed-size description of the next frame: dimensions, previous dimensions, pointer position, flow phases, delta time, interaction strength, active particle count, update count, trail decay, command flags, and the current simulation cohort.

The shader then runs the same simulation logic across many particle indexes in parallel.

### A 64-byte command instead of a particle array

The command is 16 words, and every word is four bytes. Some words represent `u32` counts or flags; others carry the bit pattern of an `f32` value. Rust stores both in one `[u32; 16]` so the packet has a fixed address, fixed size, and no heap allocation per frame.

The important part is that `to_bits` does not numerically convert a float into an integer. It preserves the float's exact 32-bit representation:

~~~rust
const COMMAND_WORDS: usize = 16;
const SIMULATION_DELTA_SECONDS: usize = 8;
const ACTIVE_PARTICLE_COUNT: usize = 10;

fn write_f32(command: &mut [u32; COMMAND_WORDS], index: usize, value: f32) {
    command[index] = value.to_bits();
}

write_f32(&mut command, SIMULATION_DELTA_SECONDS, delta_seconds);
command[ACTIVE_PARTICLE_COUNT] = active_particles;
~~~

The same 64 bytes are therefore valid as raw upload bytes and as 16 integer words. JavaScript keeps both views over the same WASM memory:

~~~ts
const commandBytes = new Uint8Array(
  engine.memory.buffer,
  commandAddress,
  64,
);

const commandWords = new Uint32Array(
  engine.memory.buffer,
  commandAddress,
  16,
);

device.queue.writeBuffer(uniformBuffer, 0, commandBytes);
~~~

`commandBytes` is used for the GPU upload. `commandWords` lets JavaScript read the update count needed to dispatch the compute pass. Neither view copies the command; each is a window onto the same WASM linear memory.

The WGSL uniform struct declares the fields in the same order. The renderer checks that Rust still reports a 64-byte command before it creates any pipeline. That size check cannot prove that every field has the right meaning, but it catches accidental layout growth immediately.

The simplified GPU state is only two vectors:

~~~wgsl
struct Particle {
  position: vec2<f32>,
  velocity: vec2<f32>,
}
~~~

The compute shader maps each invocation to a particle, updates it, and writes it back into the same GPU buffer:

~~~wgsl
@compute @workgroup_size(256)
fn compute_main(
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let invocation_index = global_id.x;
  if (invocation_index >= frame.update_particle_count) {
    return;
  }

  let index =
    invocation_index * frame.update_particle_stride +
    frame.update_particle_offset;

  var particle = particles[index];
  // Apply flow, pointer interaction, damping, and wrapping.
  particles[index] = particle;
}
~~~

There are three indexes worth keeping separate:

- `global_id.x` is the invocation number created by the compute dispatch.
- `invocation_index` is that same number after the shader names it.
- `index` is the actual location in the particle storage buffer after applying the cohort stride and offset.

For a four-way cohort, frame offsets rotate through `0`, `1`, `2`, and `3`. Offset `0` updates particle indexes `0, 4, 8, 12...`; offset `1` updates `1, 5, 9, 13...`. After four display frames, every active particle has advanced exactly once.

The CPU dispatch is sized from the update count rather than the total particle count:

~~~ts
const updateCount = commandWords[11];
const workgroupCount = Math.ceil(updateCount / 256);
computePass.dispatchWorkgroups(workgroupCount);
~~~

Each workgroup contains 256 shader invocations. The bounds check at the top of `compute_main` handles the final partially filled workgroup, so the dispatch can round up without touching a particle outside the selected cohort.

This is still programmatic logic, but it is logic designed for massive parallelism. Shaders can branch and do math, but they are less comfortable than Rust for dynamic data structures, irregular control flow, allocation, strings, networking, or coordinating application state.

That is why the hybrid is useful: Rust decides what should happen; the GPU repeats the expensive part at scale.

## Animation and physics stayed time-based

Moving work to the GPU did not mean tying the simulation to whatever frame rate the browser happened to deliver.

The React animation loop uses `requestAnimationFrame`, pauses when the document is hidden, and resets its previous timestamp when it resumes. It also respects `prefers-reduced-motion` by starting paused. Browser-side timing clamps each frame between 1/240 and 1/24 of a second, so a background-tab gap cannot become one enormous physics step.

Rust validates those values again before writing the frame command. The UI exposes 0.5x through 8x speed, while Rust clamps the underlying policy to a finite 0.1x through 8x range. Speed affects the simulation delta and flow phases, but not trail decay. A faster simulation therefore moves particles farther without also erasing their trails eight times faster.

Each particle then follows the same sequence in WGSL:

1. Derive a stable phase from the particle index.
2. Sample sine and cosine flow components from position, phase, and elapsed simulation time.
3. Apply pointer attraction or repulsion inside a bounded radius. The sign of the gravity control determines the direction.
4. Apply damping as `pow(0.992, delta * 60.0)`, which preserves the same decay over real simulation time at different frame rates.
5. Integrate position from velocity.
6. Wrap each coordinate across a four-pixel padded boundary while preserving overshoot.

Simulation cohorts introduce one additional detail. At eight-way interleaving, one particle is updated every eight display frames, so the shader multiplies its delta by eight. The field still changes every frame because the selected indexes are interleaved across the buffer rather than stored as eight visually separate blocks.

Resizing is also a frame command, not a CPU rewrite of the particle array. Rust records the previous and next dimensions, then the compute shader scales every stored position. Initialization and resize frames deliberately process the full device capacity with a stride of one so every particle is valid before it can become active.

Trail animation uses a separate wall-clock calculation. The reference fade removes 20 percent at 60 FPS, and the actual alpha is exponentiated from the real frame delta. Two 120 FPS fades therefore retain the same amount as one 60 FPS fade.

The policy is small enough to show in full:

~~~rust
fn trail_alpha(delta_seconds: f32) -> f32 {
    1.0 - (1.0 - 0.2).powf(delta_seconds * 60.0)
}
~~~

At 60 FPS, `delta_seconds * 60` is `1`, so the result is the original `0.2` fade. At 120 FPS the exponent is `0.5`, producing a smaller per-frame fade. Applying that smaller fade twice leaves the same retained trail energy as one 60 FPS frame. Simulation speed is deliberately absent from this function: playback speed changes motion, not the wall-clock lifetime of the trail.

## The first useful target: 100,000

At 100,000 particles, the GPU architecture held the browser's 60 FPS cadence and remained interactive. Pointer gravity, speed changes, resizing, and trails all stayed on the GPU side of the boundary.

The experiment intentionally defaults to 100,000. It is visually rich, leaves room for other page work, and keeps the higher values opt-in.

The slider first grew to 2.1 million so I could find the real limits instead of guessing at them. Once that path held 60 FPS, I doubled the ceiling again to 4.2 million.

## Why 2.1 million was initially slow

The first 2.1-million-particle version rendered successfully, but settled around 11 FPS on the machine used for development. WebGPU had removed the CPU-to-GPU particle copy, but that did not make GPU work free.

There were four large costs:

1. Every particle ran the full simulation every frame, including trigonometry, interaction, damping, and boundary checks.
2. Every particle was rendered as a six-vertex quad. At 2.1 million particles, that meant 12.6 million vertex shader invocations per frame.
3. Each particle occupied 32 bytes, so the storage buffer reserved 67.2 MB and each pass moved more data than it needed.
4. The enlarged canvas used a high-density render target, while trail fading and final compositing also touched the full viewport.

Making the viewport larger helped the particles breathe visually, but it increased the number of pixels processed by every full-screen pass. A larger canvas is a presentation improvement, not a free performance improvement.

## The adaptive high-density path

The final renderer changes strategy as density increases.

### Smaller particle state

The GPU now stores only position and velocity: 16 bytes per particle, or 67.2 MB for 4.2 million particles.

Phase is derived deterministically from the particle index. Size and opacity are derived from velocity in the render shader. Recomputing those small values is cheaper than carrying twice as much state through the simulation and rendering passes.

Initialization uses the same idea. A small integer hash turns the particle index plus a stream number into repeatable pseudo-random values:

~~~wgsl
fn random(index: u32, stream: u32) -> f32 {
  let mixed = index ^ (stream * 0x9e3779b9u) ^ 0x5eed1234u;
  return f32(hash_u32(mixed)) / 4294967295.0;
}

particle.position = vec2<f32>(
  random(index, 0u) * frame.dimensions.x,
  random(index, 1u) * frame.dimensions.y,
);
particle.velocity = vec2<f32>(
  (random(index, 2u) - 0.5) * 18.0,
  (random(index, 3u) - 0.5) * 18.0,
);
~~~

The `stream` argument gives position and velocity independent deterministic sequences without storing a random seed per particle. Initialization still touches the whole capacity once, but JavaScript does not allocate a 67.2 MB staging array or upload one across the CPU-to-GPU boundary.

### Cheaper geometry

At lower densities, soft particles use one triangle instead of a two-triangle quad, cutting vertex work in half.

Above 450,000 particles, the renderer switches to WebGPU point primitives. Each particle needs one vertex instead of three or six. At that density, a one-pixel point plus the trail texture is enough to preserve the character of the field.

### A lower internal resolution

The page can still use a large CSS viewport, but high-density mode caps the internal render target at 1x pixel density. On a Retina display, that removes roughly three quarters of the full-screen texture work compared with a 2x target.

The browser then scales the result to the same visible canvas size.

### Rotating simulation cohorts

The biggest compute improvement came from not updating every particle on every display frame.

- Up to 450,000 particles, every particle is simulated every frame.
- Above 450,000, Rust alternates between two simulation cohorts.
- Above 1.2 million, Rust rotates through four cohorts.
- Above 2.4 million, Rust rotates through eight cohorts.

At 2.1 million, the compute shader advances 525,000 particles per frame. Every particle is still alive in GPU memory, but each individual particle advances once every four frames with a correspondingly larger time step.

At 4.2 million, the eight-way policy keeps that per-frame compute count at the same 525,000 particles. Each particle advances once every eight frames, while a different evenly distributed cohort moves on every display frame.

Because a different, evenly distributed cohort moves each frame, the field as a whole still changes every frame.

The policy itself is ordinary Rust and intentionally uses strict threshold comparisons:

~~~rust
fn simulation_update_stride(particle_count: u32) -> u32 {
    if particle_count > 2_400_000 {
        8
    } else if particle_count > 1_200_000 {
        4
    } else if particle_count > 450_000 {
        2
    } else {
        1
    }
}
~~~

That makes the boundary behavior explicit: exactly `2,400,000` particles still use four cohorts, while `2,400,001` switches to eight. On ordinary frames, the current 2.35-million-particle article header therefore updates `587,500` particles with stride four. At 4.2 million, stride eight brings the update count back down to `525,000`.

The shader compensates for the less frequent update by multiplying the simulation delta by the stride:

~~~wgsl
let delta =
  frame.simulation_delta_seconds * f32(frame.update_particle_stride);
~~~

Without that multiplication, an eight-way cohort would move each particle using only one frame's worth of time every eight frames. The simulation would slow to one eighth speed as density increased.

### Rotating render cohorts

At 2.1 million, drawing one point for every particle was still enough to hold the experiment near 30 FPS rather than 60.

The final step caps each render cohort at 1.05 million particles. The 2.1-million-particle field alternates between two halves of the particle buffer; the 4.2-million-particle field rotates through four quarters. The point shader scales contribution by the active render-cohort count so doubling the number of cohorts does not make the accumulated field look half as dense.

This works because the trail texture is persistent. While one cohort is drawn, the previous cohort remains visible and fades naturally. The next frame swaps them.

The render cohort is contiguous rather than interleaved. WebGPU's first-instance argument selects the starting particle, and `@builtin(instance_index)` becomes the storage-buffer index in the point vertex shader:

~~~ts
const cohortCount = Math.ceil(
  activeParticleCount / 1_050_000,
);
const cohortSize = Math.ceil(
  activeParticleCount / cohortCount,
);
const firstParticle = renderPhase * cohortSize;
const renderedCount = Math.min(
  cohortSize,
  activeParticleCount - firstParticle,
);

particlePass.draw(1, renderedCount, 0, firstParticle);
renderPhase = (renderPhase + 1) % cohortCount;
~~~

The first argument is one vertex per point. The second is the number of particle instances. The fourth is the first instance, which lets the shader read a different contiguous range without rebuilding a bind group or copying particle data.

For 2.35 million particles, `ceil(2,350,000 / 1,050,000)` produces three render cohorts of at most 783,334 particles. For 4.2 million, it produces four cohorts of exactly 1.05 million.

The field contains 4.2 million particle states, but it simulates only 525,000 and rasterizes at most 1.05 million on each refresh.

That is the central performance tradeoff.

### One submitted frame contains four pieces of work

The browser packages the GPU work into one command encoder and submits it once:

1. **Compute:** update the selected simulation cohort in the storage buffer.
2. **Fade:** sample the previous trail texture into the next texture while mixing it toward the background color.
3. **Draw:** add the selected particle render cohort into that next trail texture.
4. **Composite:** draw the completed trail texture to the current canvas texture.

The trail textures alternate roles each frame. If texture A is the previous frame, the fade and particle passes write texture B, the composite pass presents B, and then B becomes the previous frame for the next iteration. This avoids sampling from and rendering into the same texture at once.

The fade shader is only a texture sample and a time-corrected mix:

~~~wgsl
@fragment
fn fade_fragment(input: VertexOutput) -> @location(0) vec4<f32> {
  let previous = textureSample(
    trail_texture,
    trail_sampler,
    input.uv,
  ).rgb;
  let background = vec3<f32>(5.0 / 255.0, 7.0 / 255.0, 13.0 / 255.0);
  return vec4<f32>(mix(previous, background, frame.trail_alpha), 1.0);
}
~~~

Because old cohorts remain in the trail texture for multiple frames, render cohorts can rotate without making most of the field disappear between draws.

### The 4.2 million ceiling is device-aware

`4,200,000` is the experiment's requested ceiling, not a promise made to every GPU. The browser chooses the smallest of:

- the application cap
- the device's maximum storage-buffer binding size divided by the 16-byte particle stride
- the device's maximum compute workgroups multiplied by the 256-thread workgroup size

In the renderer, that negotiation is a direct minimum across independent limits:

~~~ts
const maxParticleCount = Math.max(
  1,
  Math.min(
    4_200_000,
    Math.floor(
      device.limits.maxStorageBufferBindingSize / 16,
    ),
    device.limits.maxComputeWorkgroupsPerDimension * 256,
  ),
);
~~~

The storage-buffer calculation divides bytes by the 16-byte particle stride. The workgroup calculation asks how many particles can be reached by the maximum one-dimensional dispatch. The outer `Math.max` ensures the controller always receives a usable positive capacity, even on an unexpectedly constrained implementation.

Rust receives that negotiated capacity and clamps active counts against it. The React slider is then updated to the renderer's actual maximum. If WebGPU is unavailable or initialization fails, the page retains the original Rust/WASM and Canvas 2D renderer with a deliberately smaller 2,400-particle ceiling.

The current WebGPU path eagerly allocates and initializes its maximum capacity even though the experiment starts at 100,000 active particles. At 4.2 million, the particle storage buffer alone is 67.2 MB. The two RGBA trail textures add memory based on viewport dimensions, while the uniform command remains 64 bytes.

That eager allocation keeps density changes immediate and makes every particle valid before the slider exposes it, but it is also the clearest remaining architectural cost. A future version could grow capacity and initialize newly exposed ranges on demand.

## The boundary bug that looked like a density bug

Once the field crossed into the high-density path, regular horizontal and vertical bands began appearing near the canvas edges. Because the artifacts became obvious around the same threshold that enabled point rendering, 1x resolution, and simulation cohorts, those optimizations were the first suspects.

The actual source was older and simpler: boundary wrapping discarded each particle's overshoot.

~~~wgsl
if (particle.position.x < -4.0) {
  particle.position.x = frame.dimensions.x + 4.0;
} else if (particle.position.x > frame.dimensions.x + 4.0) {
  particle.position.x = -4.0;
}
~~~

Every particle crossing an edge in the same direction landed on exactly the same coordinate. At 100,000 particles, the alignment was difficult to see. At hundreds of thousands or millions, the trail texture repeatedly accumulated those aligned particles into bright lines, and the flow field carried parallel copies inward.

The density threshold exposed the discontinuity; it did not create it.

The fix treats the padded canvas as a continuous interval and preserves the distance traveled beyond the boundary:

~~~wgsl
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
~~~

The Rust Canvas fallback uses the same rule with `rem_euclid`, backed by tests for both boundaries. After rebuilding the WASM artifact, I ran the original high-density renderer at 2.1 million particles for 15 seconds: it held the browser's 60 FPS cadence, reported no WebGPU warnings or errors, and no longer produced edge-aligned bands.

## Verification was part of the implementation

The browser's FPS counter was the final behavioral measurement, not the only check.

- Rust tests cover full-capacity initialization, active-count clamping, ordinary frames, four-way and eight-way cohort rotation, exact density thresholds, speed scaling, speed-independent trail decay, long-frame clamping, and boundary wrapping in both directions.
- Browser-side tests cover first-frame timing, long-gap clamping, the 60 FPS trail reference, and equivalent trail retention at 60 and 120 FPS.
- The renderer checks that Rust still exports exactly the 64-byte command layout expected by WGSL before creating pipelines.
- WebGPU shader compilation messages and a pipeline validation error scope turn shader or binding failures into explicit initialization errors.
- Device-loss handling stops animation and surfaces the failure instead of silently continuing with a dead canvas.
- The release WASM module is rebuilt and committed so production does not require a Rust toolchain during the Next.js build.
- Static checks, TypeScript, content validation, unit tests, Clippy, and the production build run before the browser stress test.

## What the measurements showed

These are development measurements from one browser and machine, using the experiment's on-screen requestAnimationFrame counter. They are useful comparisons, not universal GPU benchmarks.

| Stage | Observed cadence |
| --- | ---: |
| Default 100,000-particle field | 60 FPS |
| Full-detail path at 500,000 | 44 FPS |
| Adaptive path at 500,000 | 60 FPS |
| Adaptive path at 1 million | 60 FPS |
| First 2.1-million implementation | about 11 FPS |
| Point rendering and simulation cohorts at 2.1 million | about 30 FPS |
| Simulation and render cohorts at 2.1 million | 60 FPS |
| Eight simulation cohorts and four render cohorts at 4.2 million | 60 FPS |

For the 4.2-million-particle run, six samples taken five seconds apart all reported 60 FPS at the default 2.5x simulation speed. Four more samples taken three seconds apart also reported 60 FPS at the slider's 8x maximum. The canvas remained active and visually coherent through both runs.

The browser was returned to the 100,000-particle default after testing.

The 60 FPS result also needs context. A page driven by requestAnimationFrame normally runs at the display's refresh cadence. On a 60 Hz display, doing the work in less than 16.7 milliseconds creates headroom, but it does not produce more than 60 visible frames per second. A high-refresh display can request frames more frequently if the browser and GPU keep up.

## What Rust is still doing

Moving simulation into a shader did not make Rust unnecessary.

Rust still owns:

- count and capacity clamping
- finite-value and timing policy
- delta-time limits
- playback-speed scaling
- resize and initialization flags
- trail-decay policy
- simulation cohort stride and offset
- the stable binary layout shared with WGSL

That policy has ordinary Rust unit tests, including checks that boundary wrapping preserves overshoot in both directions. The browser renderer separately checks the exported command size before creating the GPU pipelines, so a Rust/WGSL layout mismatch fails early.

Browsers without WebGPU retain the original Rust/WASM and Canvas 2D implementation, capped at a much smaller particle count.

## What I would measure next

The current FPS display measures frame submission cadence, not individual compute and render pass duration. The next serious profiling step would use GPU timestamp queries where supported and break the frame into:

- uniform upload
- compute simulation
- trail fade
- particle rendering
- canvas composite

That would make it possible to tune thresholds per device instead of using fixed values.

Other useful follow-ups would be lazy initialization of newly exposed particle ranges, automatic quality adjustment around a target frame time, and separate presets for battery life, visual fidelity, and maximum density.

## The durable takeaway

Rust/WASM made the original simulation fast, but the architecture still moved too much particle data through the CPU side of the browser.

WebGPU made the larger jump possible because particle state stayed where it was simulated and drawn. Reaching 4.2 million smoothly required another change in thinking: at very high density, the viewer cannot resolve every particle update independently, so temporal cohorts can exchange invisible precision for visible smoothness.

The result is not "WASM versus WebGPU." It is Rust controlling a small, testable frame protocol while WebGPU performs and renders the parallel work without a per-particle boundary crossing.

## Implementation map

The main pieces live in:

- `packages/wasm-canvas-engine/src/gpu_controller.rs`: Rust frame policy and cohort selection
- `packages/wasm-canvas-engine/src/lib.rs`: WASM exports and Canvas fallback
- `apps/web/src/app/experiments/wasm-canvas/webgpu-particle-renderer.ts`: WebGPU setup, WGSL, buffers, passes, and adaptive rendering
- `apps/web/src/app/experiments/wasm-canvas/wasm-canvas.tsx`: React controls and animation lifecycle
- `apps/web/src/app/experiments/wasm-canvas/wasm-canvas.module.css`: the responsive experiment viewport
