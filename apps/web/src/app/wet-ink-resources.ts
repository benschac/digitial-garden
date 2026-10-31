import { Result } from "effect";

import { createRendererScope } from "./experiments/wasm-canvas/renderer-lifecycle";

type ResourceOwner = ReturnType<typeof createRendererScope>;

export const createWetInkTextureSlot = <T>(
  owner: ResourceOwner,
  release: (texture: T) => void
) => {
  let current: { value: T; owner: ResourceOwner } | undefined;
  let closed = false;
  owner.defer(() => {
    closed = true;
    const previous = current;
    current = undefined;
    previous?.owner.close();
  });

  return {
    replace(
      create: () => T,
      prepare: (texture: T) => void,
      restore: (texture: T) => void
    ) {
      if (closed) {
        throw new Error("Wet ink resources are closed.");
      }

      const candidateOwner = createRendererScope();
      const value = candidateOwner.acquire(create, release);

      try {
        if (closed) {
          throw new Error("Wet ink resources are closed.");
        }

        prepare(value);

        if (closed) {
          throw new Error("Wet ink resources are closed.");
        }
      } catch (error) {
        const previous = current;

        if (!closed && previous) {
          Result.try(() => restore(previous.value));
        }

        Result.try(() => candidateOwner.close());
        throw error;
      }

      const previous = current;
      current = { owner: candidateOwner, value };
      previous?.owner.close();
    },
  };
};

export const withWetInkResources = async <T extends object>(
  signal: AbortSignal,
  create: (owner: ResourceOwner) => Promise<T>
) => {
  if (signal.aborted) {
    return null;
  }

  const owner = createRendererScope(signal);

  try {
    const renderer = await create(owner);
    signal.throwIfAborted();

    return { ...renderer, destroy: () => owner.close() };
  } catch (error) {
    Result.try(() => owner.close());

    if (signal.aborted) {
      return null;
    }

    throw error;
  }
};
