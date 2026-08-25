import type { EffectCallback } from "react";
import { useEffect, useEffectEvent } from "react";

type AbortableEffectCallback = (signal: AbortSignal) => ReturnType<EffectCallback>;

/**
 * Runs an effect with a fresh signal and aborts it before the effect's cleanup.
 */
export function useAbortableEffect(
  callback: AbortableEffectCallback,
) {
  const onEffect = useEffectEvent(callback);

  useEffect(() => {
    const abortController = new AbortController();
    const cleanup = onEffect(abortController.signal);

    return () => {
      abortController.abort();
      cleanup?.();
    };
  }, []);
}
