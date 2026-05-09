"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect if a media query matches.
 * Used for responsive layout switching (e.g. table → card view on mobile).
 *
 * Returns `undefined` during SSR / initial hydration to avoid mismatch,
 * then resolves to a boolean once the client has measured.
 *
 * @example
 * const isMobile = useMediaQuery("(max-width: 767px)");
 * // isMobile is undefined on first render, then true/false
 */
export function useMediaQuery(query: string): boolean | undefined {
  const [matches, setMatches] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia(query);
    // Set initial value once we're on the client
    setMatches(media.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", handler);

    return () => media.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// ---- Preset breakpoints ----

export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsTablet() {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)");
}
