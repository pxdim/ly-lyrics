/**
 * ThemeApplier
 *
 * 監聽 Zustand store 的 displaySettings.theme，
 * 在 <html> 元素上設定 data-theme 屬性以驅動 CSS 變數覆寫。
 * 不渲染任何 DOM 內容。
 */

"use client";

import { useEffect } from "react";
import { useLyricsStore } from "@/lib/store";

export function ThemeApplier() {
  const theme = useLyricsStore(
    (state) => state.displaySettings.theme,
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return null;
}
