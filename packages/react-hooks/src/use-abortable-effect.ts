import type { EffectCallback } from "react";
import { useEffect, useEffectEvent } from "react";
import { useAbortController } from "./use-abort-controller";

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
 * Runs an effect with a fresh abort signal while enabled.
 *
 * The signal is aborted before the callback's optional React effect cleanup is
 * invoked. The callback always sees the latest render values without causing
 * the effect to restart. Disabling aborts and cleans up the current run;
 * enabling starts a new run. Omit `enabled` for component-lifetime work.
 *
 * @param effect - Starts the abortable work and optionally returns a cleanup
 * function. Use the supplied signal with APIs such as `fetch`.
 * @param enabled - Whether the effect should be active. Defaults to true.
 */
export function useAbortableEffect(effect: AbortableEffect, enabled = true) {
  const createController = useAbortController();
  const onEffect = useEffectEvent(effect);

  useEffect(() => {
    if (!enabled) return;
    const abortController = createController();
    let cleanup: ReturnType<EffectCallback>;
    try {
      cleanup = onEffect(abortController.signal);
    } catch (error) {
      abortController.abort();
      throw error;
    }

    return () => {
      abortController.abort();
      cleanup?.();
    };
  }, [createController, enabled]);
}
