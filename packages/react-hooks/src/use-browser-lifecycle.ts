import type { RefObject } from "react";
import { useEffect, useEffectEvent } from "react";

/**
 * Handles a document event selected from `DocumentEventMap`.
 *
 * @param event - The event type associated with the selected document event
 * name.
 */
export type DocumentEventListener<K extends keyof DocumentEventMap> = (
  event: DocumentEventMap[K],
) => void;

/**
 * Handles a window event selected from `WindowEventMap`.
 *
 * @param event - The event type associated with the selected window event name.
 */
export type WindowEventListener<K extends keyof WindowEventMap> = (
  event: WindowEventMap[K],
) => void;

/**
 * Receives the current match state for a media query.
 *
 * @param matches - Whether the media query currently matches the document.
 */
export type MediaQueryListener = (matches: boolean) => void;

/** Responds when an observed element should be measured again. */
export type ResizeObserverListener = () => void;

/**
 * Receives the current viewport intersection state for an observed element.
 *
 * @param isIntersecting - Whether the observed element currently intersects
 * the viewport.
 */
export type IntersectionObserverListener = (isIntersecting: boolean) => void;

/**
 * Subscribes to a typed event on the global `document` for the component's
 * lifetime.
 *
 * The subscription changes only when `type` changes, while `listener` always
 * sees the latest render values.
 *
 * @param type - A key from `DocumentEventMap`, which determines the event type.
 * @param listener - Handles the correctly narrowed document event.
 */
export function useDocumentEvent<K extends keyof DocumentEventMap>(
  type: K,
  listener: DocumentEventListener<K>,
): void {
  const onEvent = useEffectEvent(listener);

  useEffect(() => {
    document.addEventListener(type, onEvent);
    return () => document.removeEventListener(type, onEvent);
  }, [type]);
}

/**
 * Subscribes to a typed event on the global `window` for the component's
 * lifetime.
 *
 * @param type - A key from `WindowEventMap`, which determines the event type.
 * @param listener - Handles the correctly narrowed window event.
 * @param options - Native `addEventListener` subscription options. Keep object
 * options referentially stable to avoid resubscribing every render.
 */
export function useWindowEvent<K extends keyof WindowEventMap>(
  type: K,
  listener: WindowEventListener<K>,
  options?: AddEventListenerOptions | boolean,
): void {
  const onEvent = useEffectEvent(listener);

  useEffect(() => {
    window.addEventListener(type, onEvent, options);
    return () => window.removeEventListener(type, onEvent, options);
  }, [options, type]);
}

/**
 * Observes whether a CSS media query currently matches.
 *
 * The listener is called immediately with the current value, then whenever the
 * query's match state changes.
 *
 * @param query - A CSS media query accepted by `window.matchMedia`.
 * @param listener - Receives the current match state.
 */
export function useMediaQuery(
  query: string,
  listener: MediaQueryListener,
): void {
  const onChange = useEffectEvent(listener);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      onChange(event.matches);
    };

    onChange(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);
}

/**
 * Observes size changes for the element currently held by a React ref.
 *
 * The listener runs once after observation begins and after each resize. No
 * observer is created when the ref is empty.
 *
 * @param elementRef - A stable ref containing the element to observe.
 * @param listener - Responds to initial measurement and subsequent resizes.
 */
export function useResizeObserver<TElement extends Element>(
  elementRef: RefObject<TElement | null>,
  listener: ResizeObserverListener,
): void {
  const onResize = useEffectEvent(listener);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(onResize);
    observer.observe(element);
    onResize();
    return () => observer.disconnect();
  }, [elementRef]);
}

/**
 * Observes whether the element held by a React ref intersects the viewport.
 *
 * This uses the browser observer's default root, threshold, and root margin. No
 * observer is created when the ref is empty.
 *
 * @param elementRef - A stable ref containing the element to observe.
 * @param listener - Receives the element's latest intersection state.
 */
export function useIntersectionObserver<TElement extends Element>(
  elementRef: RefObject<TElement | null>,
  listener: IntersectionObserverListener,
): void {
  const onIntersection = useEffectEvent(listener);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        onIntersection(entry.isIntersecting);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef]);
}
