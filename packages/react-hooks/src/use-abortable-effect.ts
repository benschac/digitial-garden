import type { EffectCallback } from "react";
import { useEffect, useEffectEvent } from "react";

/**
 * An effect that can cancel in-flight work when its component unmounts.
 *
 * @param signal - An abort signal that fires during teardown, before the
 * optional cleanup function runs.
 * @returns An optional cleanup function, following React effect semantics.
 */
export type AbortableEffect = (
  signal: AbortSignal,
) => ReturnType<EffectCallback>;

/**
 * Runs an effect once with a fresh abort signal.
 *
 * The signal is aborted before the callback's optional React effect cleanup is
 * invoked. The callback always sees the latest render values without causing
 * the effect to restart.
 *
 * @param effect - Starts the abortable work and optionally returns a cleanup
 * function. Use the supplied signal with APIs such as `fetch`.
 */
export function useAbortableEffect(effect: AbortableEffect) {
  const onEffect = useEffectEvent(effect);

  useEffect(() => {
    const abortController = new AbortController();
    const cleanup = onEffect(abortController.signal);

    return () => {
      abortController.abort();
      cleanup?.();
    };
  }, []);
}
