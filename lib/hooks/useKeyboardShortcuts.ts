/**
 * useKeyboardShortcuts Hook
 *
 * 通用鍵盤快捷鍵綁定 hook。
 * 自動忽略焦點在輸入元素（input/textarea/select/contentEditable）內的事件，
 * 避免干擾文字輸入。
 */

import { useEffect } from "react";

/** 快捷鍵對應表：鍵名 → 事件處理函式 */
export interface ShortcutMap {
  [key: string]: (e: KeyboardEvent) => void;
}

/**
 * 綁定鍵盤快捷鍵到 window keydown 事件。
 *
 * @param shortcuts - 按鍵名稱與 callback 的對應表（使用 KeyboardEvent.key 值）
 * @param enabled - 是否啟用快捷鍵監聽（預設 true）
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // 焦點在輸入元素時忽略所有快捷鍵
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (target.contentEditable === "true") return;

      const fn = shortcuts[e.key];
      if (fn) {
        e.preventDefault();
        fn(e);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts, enabled]);
}
