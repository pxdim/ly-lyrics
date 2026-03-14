# S02: 邊緣情況與安全性強化

## 目標
處理三個關鍵邊緣情況：確認無 XSS 風險、超長歌詞行溢出處理、快速點擊防抖。

## 參考檔案（請先讀取）
- `components/lyrics/LyricsLine.tsx` — 歌詞行渲染元件
- `components/lyrics/LyricsDisplay.tsx` — 歌詞顯示容器
- `components/lyrics/LyricsControl.tsx` — 控制按鈕
- `lib/store/index.ts` — Store actions（nextLine, prevLine）

## 修改檔案
- `components/lyrics/LyricsLine.tsx` — 超長行 CSS 處理
- `components/lyrics/LyricsControl.tsx` — 按鈕防抖
- `lib/hooks/useDebounce.ts` — **新建** 防抖 hook

## 測試檔案
- `lib/hooks/useDebounce.test.ts` — **新建**

## 實作細節

### 1. XSS 安全確認
React 預設會 escape HTML entities（`{text}` 渲染），所以基本 XSS 已被防護。
請用 grep 搜尋整個專案確認沒有不安全的 HTML 注入模式：
- 搜尋 `innerHTML` — 不應出現在任何元件中
- 如果發現，改為純文字渲染或使用安全的 sanitizer

### 2. 超長歌詞行溢出處理
在 LyricsLine 元件的根元素加入 CSS：
```css
overflow-wrap: break-word;
word-break: break-word;
max-width: 100%;
```
確保超長英文單字或無空格中文長句不會撐破容器。

### 3. 按鈕防抖
建立 `lib/hooks/useDebounce.ts`：
```typescript
import { useCallback, useRef } from "react";

export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number = 150
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]) as T;
}
```

在 LyricsControl 的 next/prev 按鈕上套用防抖。

### 4. 測試
- `useDebounce.test.ts`：測試防抖行為（多次呼叫只觸發一次、delay 後執行、取消機制）
- 使用 `vi.useFakeTimers()` 控制時間

## 驗收標準
- [ ] grep 確認無不安全的 HTML 注入模式
- [ ] 超長行正確換行（CSS 層面）
- [ ] 防抖 hook 有單元測試且通過
- [ ] npx vitest run 全部通過
- [ ] npm run build 通過

## Commit
```
fix(security): add text overflow handling and button debounce
```
