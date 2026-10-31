import { Effect, Schema } from "effect";

import type { ParticleRenderer } from "./particle-renderer";

class GpuInitializationError extends Schema.TaggedError<GpuInitializationError>()(
  "GpuInitializationError",
  { cause: Schema.Defect() }
) {}

class RendererInitializationError extends Schema.TaggedError<RendererInitializationError>()(
  "RendererInitializationError",
  { cause: Schema.Defect() }
) {}

export function isRendererAbort(error: unknown, signal: AbortSignal) {
  return (
    signal.aborted ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

export async function initializeParticleRenderer({
  signal,
  createGpu,
  createFallback,
  onGpuFailure,
  onFallback,
  configure,
}: {
  signal: AbortSignal;
  createGpu: (signal: AbortSignal) => Promise<ParticleRenderer | null>;
  createFallback: (signal: AbortSignal) => Promise<ParticleRenderer>;
  onGpuFailure: (error: unknown) => void;
  onFallback?: () => void;
  configure?: (renderer: ParticleRenderer) => void;
}): Promise<ParticleRenderer> {
  const accept = (renderer: ParticleRenderer | null) => {
    if (signal.aborted) {
      renderer?.destroy();
      signal.throwIfAborted();
    }
    return renderer;
  };
  signal.throwIfAborted();
  const initializedRenderer = await Effect.runPromise(
    Effect.tryPromise({
      try: () => createGpu(signal).then(accept),
      catch: (cause) => new GpuInitializationError({ cause }),
    }).pipe(
      Effect.catchTag("GpuInitializationError", (error) =>
        isRendererAbort(error.cause, signal)
          ? Effect.fail(error)
          : Effect.sync(() => {
              onGpuFailure(error.cause);
              return null;
            })
      ),
      Effect.flatMap((renderer) =>
        renderer
          ? Effect.succeed(renderer)
          : Effect.tryPromise({
              try: async () => {
                signal.throwIfAborted();
                onFallback?.();
                const fallback = await createFallback(signal);
                accept(fallback);
                return fallback;
              },
              catch: (cause) => new RendererInitializationError({ cause }),
            })
      )
    )
  ).catch((error: unknown) => {
    if (
      error instanceof GpuInitializationError ||
      error instanceof RendererInitializationError
    ) {
      throw error.cause;
    }
    throw error;
  });

  try {
    signal.throwIfAborted();
    configure?.(initializedRenderer);
    signal.throwIfAborted();

    return initializedRenderer;
  } catch (error) {
    initializedRenderer.destroy();
    throw error;
  }
}
