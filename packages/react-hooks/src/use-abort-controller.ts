import { useCallback, useEffect, useRef } from "react";

/** Starts a new operation, aborting the previous controller owned by this hook. */
export type CreateAbortController = () => AbortController;

/**
 * Returns a stable factory for one active abortable operation at a time.
 * Call it from an effect or event handler, never during render. Each call
 * aborts the previous operation and returns a fresh controller. Unmount also
 * aborts the active operation. Effect callers should still abort their own
 * controller in cleanup so dependency changes cancel work immediately.
 *
 * Creating controllers on demand avoids reusing an aborted signal when React
 * replays effects in Strict Mode.
 */
export function useAbortController(): CreateAbortController {
  const activeController = useRef<AbortController | null>(null);

  const createController = useCallback(() => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    return controller;
  }, []);

  useEffect(() => {
    return () => {
      activeController.current?.abort();
      activeController.current = null;
    };
  }, []);

  return createController;
}
