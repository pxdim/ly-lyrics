/**
 * useDebouncedCallback Hook
 *
 * 將 callback 包裝為防抖版本：在最後一次呼叫後等待指定 delay 才執行。
 * 適用於按鈕快速點擊防抖場景。
 */

import { useCallback, useRef } from "react";

/**
 * 回傳一個防抖版本的 callback。
 * 多次快速呼叫只會在最後一次呼叫後的 delay 毫秒執行一次。
 *
 * @param callback - 要防抖的函式
 * @param delay - 防抖延遲毫秒數（預設 150ms）
 * @returns 防抖版本的 callback，簽名與原函式相同
 */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number = 150
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}
