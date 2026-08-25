import { useCallback, useEffect, useRef } from "react";

/**
 * Processes one animation frame and decides whether the loop should continue.
 *
 * @param timestamp - The high-resolution timestamp supplied by
 * `requestAnimationFrame`.
 * @returns `true` to schedule another frame or `false` to stop the loop.
 */
export type AnimationFrameCallback = (
  timestamp: DOMHighResTimeStamp,
) => boolean;

/** Controls for an animation frame loop. */
export interface AnimationFrameControls {
  /** Cancels the currently scheduled frame, if one exists. */
  cancelFrame: () => void;
  /** Starts or resumes the loop without scheduling duplicate frames. */
  requestFrame: () => void;
}

/**
 * Creates an explicitly controlled animation frame loop.
 *
 * The latest callback receives the `requestAnimationFrame` timestamp and must
 * return `true` to schedule another frame or `false` to stop. Any scheduled
 * frame is automatically canceled when the component unmounts.
 *
 * @param callback - Processes a frame and indicates whether the loop continues.
 * @returns Stable controls for starting, resuming, or canceling the loop.
 */
export function useAnimationFrame(
  callback: AnimationFrameCallback,
): AnimationFrameControls {
  const animationFrameRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  callbackRef.current = callback;

  const requestFrame = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame((timestamp) => {
      animationFrameRef.current = null;

      if (callbackRef.current(timestamp)) {
        requestFrame();
      }
    });
  }, []);

  const cancelFrame = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  useEffect(() => cancelFrame, [cancelFrame]);

  return { cancelFrame, requestFrame };
}
