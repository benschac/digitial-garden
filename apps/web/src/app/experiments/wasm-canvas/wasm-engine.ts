import { Effect, Predicate, Schema } from "effect";
import { flow } from "effect/Function";

export interface ParticleEngine {
  gpu_frame_command_byte_length: () => number;
  initialize: (
    seed: number,
    count: number,
    width: number,
    height: number
  ) => void;
  initialize_gpu_controller: (
    capacity: number,
    activeParticles: number,
    width: number,
    height: number
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
    simulationSpeed: number
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
    simulationSpeed: number
  ) => number;
}

const WASM_PATH = "/wasm/particle-engine.wasm";

export class ParticleEngineFetchError extends Schema.TaggedError<
  ParticleEngineFetchError,
  { readonly brand: unique symbol }
>()("ParticleEngineFetchError", { cause: Schema.Defect() }) {}

export class ParticleEngineBodyError extends Schema.TaggedError<
  ParticleEngineBodyError,
  { readonly brand: unique symbol }
>()("ParticleEngineBodyError", { cause: Schema.Defect() }) {}

export class ParticleEngineInstantiateError extends Schema.TaggedError<
  ParticleEngineInstantiateError,
  { readonly brand: unique symbol }
>()("ParticleEngineInstantiateError", { cause: Schema.Defect() }) {}

export class ParticleEngineAbiError extends Schema.TaggedError<
  ParticleEngineAbiError,
  { readonly brand: unique symbol }
>()("ParticleEngineAbiError", { cause: Schema.Defect() }) {}

class ParticleEngineAborted extends Schema.TaggedError<
  ParticleEngineAborted,
  { readonly brand: unique symbol }
>()("ParticleEngineAborted", { cause: Schema.Defect() }) {}

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

export const decodeParticleEngineExports = flow(
  Schema.decodeUnknownEffect(ParticleEngineExports),
  Effect.mapError((cause) => new ParticleEngineAbiError({ cause })),
  Effect.map((decoded) => decoded as ParticleEngine)
);

const loadParticleEngineEffect = Effect.fnUntraced(
  function* loadParticleEngineEffect(signal: AbortSignal) {
    const checkAborted = Effect.try({
      catch: (cause) => new ParticleEngineAborted({ cause }),
      try: () => {
        signal.throwIfAborted();
      },
    });

    yield* checkAborted;

    const response = yield* Effect.tryPromise({
      catch: (cause) =>
        signal.aborted
          ? new ParticleEngineAborted({ cause: signal.reason })
          : new ParticleEngineFetchError({ cause }),
      try: async () => await fetch(WASM_PATH, { signal }),
    });

    yield* checkAborted;

    if (!response.ok) {
      return yield* new ParticleEngineFetchError({
        cause: new Error(`WASM request failed with ${response.status}`),
      });
    }

    const bytes = yield* Effect.tryPromise({
      catch: (cause) =>
        signal.aborted
          ? new ParticleEngineAborted({ cause: signal.reason })
          : new ParticleEngineBodyError({ cause }),
      try: async () => await response.arrayBuffer(),
    });

    yield* checkAborted;

    const wasmModule = yield* Effect.tryPromise({
      catch: (cause) =>
        signal.aborted
          ? new ParticleEngineAborted({ cause: signal.reason })
          : new ParticleEngineInstantiateError({ cause }),
      try: async () => await WebAssembly.instantiate(bytes, {}),
    });

    yield* checkAborted;

    return yield* decodeParticleEngineExports(wasmModule.instance.exports);
  }
);

export const loadParticleEngine = async (signal: AbortSignal) => {
  try {
    return await Effect.runPromise(loadParticleEngineEffect(signal));
  } catch (error) {
    if (error instanceof ParticleEngineAborted) {
      throw error.cause;
    }

    throw error;
  }
};
