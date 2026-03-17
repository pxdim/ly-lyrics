"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * 手機視窗偵測 hook（< 768px）
 * 取代 Controller 等頁面中重複的 matchMedia 邏輯
 *
 * @returns 是否為手機尺寸視窗
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767.98px)");
}
