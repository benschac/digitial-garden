import { Effect, Exit, Scope } from "effect";

import type { ParticleRenderer } from "./particle-renderer";

export function createRendererScope(signal?: AbortSignal) {
  const scope = Effect.runSync(Scope.make());
  let closed = false;

  return {
    acquire<T>(create: () => T, release: (resource: T) => void): T {
      signal?.throwIfAborted();
      if (closed) throw new Error("Renderer scope is closed.");
      return Effect.runSync(
        Effect.acquireRelease(Effect.sync(create), (resource) =>
          Effect.sync(() => release(resource)),
        ).pipe(Scope.provide(scope)),
      );
    },
    async acquirePromise<T>(
      create: () => Promise<T>,
      release: (resource: T) => void,
    ): Promise<T> {
      signal?.throwIfAborted();
      if (closed) return Promise.reject(new Error("Renderer scope is closed."));
      const resource = await Effect.runPromise(
        Effect.acquireRelease(
          Effect.tryPromise({ try: create, catch: (cause) => cause }),
          (resource) => Effect.sync(() => release(resource)),
        ).pipe(Scope.provide(scope)),
      );
      signal?.throwIfAborted();
      return resource;
    },
    defer(release: () => void) {
      Effect.runSync(Scope.addFinalizer(scope, Effect.sync(release)));
    },
    close() {
      if (closed) return;
      closed = true;
      Effect.runSync(Scope.close(scope, Exit.void));
    },
  };
}

export async function withRendererScope(
  signal: AbortSignal,
  create: (
    scope: ReturnType<typeof createRendererScope>,
  ) => Promise<ParticleRenderer | null>,
): Promise<ParticleRenderer | null> {
  signal.throwIfAborted();
  const scope = createRendererScope(signal);
  try {
    const renderer = await create(scope);
    if (renderer) scope.defer(() => renderer.destroy());
    signal.throwIfAborted();
    if (!renderer) {
      scope.close();
      return null;
    }
    return { ...renderer, destroy: () => scope.close() };
  } catch (error) {
    try {
      scope.close();
    } catch {
      throw error;
    }
    throw error;
  }
}
