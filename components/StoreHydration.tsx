"use client";

/**
 * StoreHydration
 *
 * Rehydrates the Zustand persist store on the client after mount.
 * Required for Next.js App Router to avoid React error #185 caused by
 * persist middleware calling set() during SSR rendering.
 */

import { useEffect } from "react";
import { useLyricsStore } from "@/lib/store";

export function StoreHydration() {
  useEffect(() => {
    useLyricsStore.persist.rehydrate();
  }, []);

  return null;
}
