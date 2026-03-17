"use client";

import { useState, useEffect } from "react";

/**
 * 泛用 media query hook
 * 監聽指定的 CSS media query 並回傳是否匹配
 *
 * @param query - CSS media query 字串，例如 "(min-width: 768px)"
 * @returns 是否符合 media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
