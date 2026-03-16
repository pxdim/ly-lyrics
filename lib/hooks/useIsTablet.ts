"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * 平板視窗偵測 hook（768px - 1279px）
 * 取代 Controller 等頁面中重複的 matchMedia 邏輯
 *
 * @returns 是否為平板尺寸視窗
 */
export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 768px) and (max-width: 1279.98px)");
}
