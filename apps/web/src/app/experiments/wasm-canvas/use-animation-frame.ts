import { useCallback, useEffect, useRef } from "react";

type AnimationFrameCallback = (milliseconds: number) => boolean;

/**
 * Runs a frame callback until it returns false. Call requestFrame to start or
 * resume the loop, and cancelFrame to stop a scheduled frame immediately.
 */
export function useAnimationFrame(callback: AnimationFrameCallback) {
  const animationFrameRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  callbackRef.current = callback;

  const requestFrame = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame((milliseconds) => {
      animationFrameRef.current = null;

      if (callbackRef.current(milliseconds)) {
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
