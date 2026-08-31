import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribes to a media query.
 * Implemented with useSyncExternalStore rather than useState plus useEffect,
 * because a media query is an external store: this reads the current value
 * during render and re-renders only when the query actually changes, with no
 * cascading second render on mount.
 */
export function useMediaQuery(query: string): boolean {
  /** Registers a listener with the browser and returns the unsubscribe. */
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  /** Reads the current value of the query. */
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Whether the device has a real hover-capable pointer.
 * Info tooltips open on hover here and on tap on touch devices, because a
 * hover-only tooltip is unusable on the phones the site team carries.
 */
export function useHoverCapable(): boolean {
  return useMediaQuery('(hover: hover) and (pointer: fine)');
}

/** Whether the viewport is at the desktop breakpoint. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
