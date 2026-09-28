import { useRef, useCallback, useEffect } from "react";

/**
 * Creates a standalone throttled function with leading-edge execution.
 * The first call executes immediately (0ms delay).
 * Subsequent calls within `waitMs` are discarded.
 */
export function throttle(fn, waitMs = 1000) {
  let lastCall = 0;

  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= waitMs) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * React hook that returns a leading-edge throttled callback.
 * Always accesses the latest callback closure without resetting the timer.
 */
export function useThrottledCallback(callback, waitMs = 1000) {
  const lastCallRef = useRef(0);
  const callbackRef = useRef(callback);

  // React 19 safe: update ref in effect rather than render body
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastCallRef.current >= waitMs) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      }
    },
    [waitMs]
  );
}

