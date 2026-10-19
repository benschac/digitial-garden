import { Effect, Predicate, Schema } from "effect";

export type ParticleEngine = {
  gpu_frame_command_byte_length: () => number;
  initialize: (
    seed: number,
    count: number,
    width: number,
    height: number,
  ) => void;
  initialize_gpu_controller: (
    capacity: number,
    activeParticles: number,
    width: number,
    height: number,
  ) => number;
  memory: WebAssembly.Memory;
  particle_count: () => number;
  perlin_noise_2d: (x: number, y: number) => number;
  perlin_noise_3d: (x: number, y: number, z: number) => number;
  prepare_gpu_frame: (
    elapsedSeconds: number,
    deltaSeconds: number,
    pointerX: number,
    pointerY: number,
    interaction: number,
    simulationSpeed: number,
  ) => number;
  resize: (width: number, height: number) => void;
  resize_gpu_controller: (width: number, height: number) => void;
  set_gpu_particle_count: (count: number) => number;
  set_particle_count: (count: number) => void;
  step: (
    time: number,
    pointerX: number,
    pointerY: number,
    interaction: number,
    simulationSpeed: number,
  ) => number;
};

const WASM_PATH = "/wasm/particle-engine.wasm";

export class ParticleEngineFetchError extends Schema.TaggedError<ParticleEngineFetchError>()(
  "ParticleEngineFetchError",
  { cause: Schema.Defect() },
) {}

export class ParticleEngineBodyError extends Schema.TaggedError<ParticleEngineBodyError>()(
  "ParticleEngineBodyError",
  { cause: Schema.Defect() },
) {}

export class ParticleEngineInstantiateError extends Schema.TaggedError<ParticleEngineInstantiateError>()(
  "ParticleEngineInstantiateError",
  { cause: Schema.Defect() },
) {}

export class ParticleEngineAbiError extends Schema.TaggedError<ParticleEngineAbiError>()(
  "ParticleEngineAbiError",
  { cause: Schema.Defect() },
) {}

class ParticleEngineAborted extends Schema.TaggedError<ParticleEngineAborted>()(
  "ParticleEngineAborted",
  { cause: Schema.Defect() },
) {}

const CallableExport = Schema.declare(Predicate.isFunction);

const ParticleEngineExports = Schema.Struct({
  gpu_frame_command_byte_length: CallableExport,
  initialize: CallableExport,
  initialize_gpu_controller: CallableExport,
  memory: Schema.instanceOf(WebAssembly.Memory),
  particle_count: CallableExport,
  perlin_noise_2d: CallableExport,
  perlin_noise_3d: CallableExport,
  prepare_gpu_frame: CallableExport,
  resize: CallableExport,
  resize_gpu_controller: CallableExport,
  set_gpu_particle_count: CallableExport,
  set_particle_count: CallableExport,
  step: CallableExport,
});

export const decodeParticleEngineExports = Effect.fnUntraced(function* (
  exports: unknown,
) {
  const decoded = yield* Schema.decodeUnknownEffect(ParticleEngineExports)(
    exports,
  ).pipe(Effect.mapError((cause) => new ParticleEngineAbiError({ cause })));
  return decoded as ParticleEngine;
});

const loadParticleEngineEffect = Effect.fnUntraced(function* (
  signal: AbortSignal,
) {
  const checkAborted = Effect.try({
    try: () => signal.throwIfAborted(),
    catch: (cause) => new ParticleEngineAborted({ cause }),
  });

  yield* checkAborted;
  const response = yield* Effect.tryPromise({
    try: () => fetch(WASM_PATH, { signal }),
    catch: (cause) =>
      signal.aborted
        ? new ParticleEngineAborted({ cause: signal.reason })
        : new ParticleEngineFetchError({ cause }),
  });
  yield* checkAborted;
  if (!response.ok) {
    return yield* new ParticleEngineFetchError({
      cause: new Error(`WASM request failed with ${response.status}`),
    });
  }

  const bytes = yield* Effect.tryPromise({
    try: () => response.arrayBuffer(),
    catch: (cause) =>
      signal.aborted
        ? new ParticleEngineAborted({ cause: signal.reason })
        : new ParticleEngineBodyError({ cause }),
  });
  yield* checkAborted;
  const module = yield* Effect.tryPromise({
    try: () => WebAssembly.instantiate(bytes, {}),
    catch: (cause) =>
      signal.aborted
        ? new ParticleEngineAborted({ cause: signal.reason })
        : new ParticleEngineInstantiateError({ cause }),
  });
  yield* checkAborted;
  return yield* decodeParticleEngineExports(module.instance.exports);
});

export async function loadParticleEngine(signal: AbortSignal) {
  try {
    return await Effect.runPromise(loadParticleEngineEffect(signal));
  } catch (error) {
    if (error instanceof ParticleEngineAborted) throw error.cause;
    throw error;
  }
}
