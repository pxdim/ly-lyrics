# S04: 鍵盤快捷鍵完善

## 目標
為 Controller 頁面加入完整的鍵盤快捷鍵支援，提升現場演出操作效率。

## 參考檔案（請先讀取）
- `app/controller/page.tsx` — Controller 頁面（找到現有 keydown listener）
- `lib/store/index.ts` — Store actions: nextLine, prevLine, togglePlaying, jumpToLine
- `app/display/page.tsx` — Display 頁面（已有 F 鍵全螢幕）

## 修改檔案
- `app/controller/page.tsx` — 加入鍵盤事件處理
- `lib/hooks/useKeyboardShortcuts.ts` — **新建** 快捷鍵 hook

## 測試檔案
- `lib/hooks/useKeyboardShortcuts.test.ts` — **新建**

## 快捷鍵定義

### Controller 頁面
| 按鍵 | 功能 | Store Action |
|------|------|-------------|
| `ArrowDown` / `ArrowRight` | 下一行 | `nextLine()` |
| `ArrowUp` / `ArrowLeft` | 上一行 | `prevLine()` |
| `Space` | 播放/暫停 | `togglePlaying()` |
| `Home` | 跳到第一行 | `jumpToLine(0)` |
| `End` | 跳到最後一行 | `jumpToLine(lyrics.length - 1)` |
| `1-9` | 快速跳到第 N 行 | `jumpToLine(n - 1)` |

### 重要：忽略規則
當焦點在 `<input>`、`<textarea>`、`<select>` 或 `contentEditable` 元素時，所有快捷鍵應被忽略，避免干擾文字輸入。

## 實作細節

### useKeyboardShortcuts hook
```typescript
// lib/hooks/useKeyboardShortcuts.ts
import { useEffect } from "react";

interface ShortcutMap {
  [key: string]: (e: KeyboardEvent) => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // 忽略輸入元素
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement).isContentEditable) return;

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
```

### Controller 整合
在 Controller 頁面中使用 hook：
```typescript
const store = useStore();

const shortcuts = useMemo(() => ({
  "ArrowDown": () => store.nextLine(),
  "ArrowRight": () => store.nextLine(),
  "ArrowUp": () => store.prevLine(),
  "ArrowLeft": () => store.prevLine(),
  " ": () => store.togglePlaying(),  // Space
  "Home": () => store.jumpToLine(0),
  "End": () => store.jumpToLine(store.lyrics.length - 1),
  ...Object.fromEntries(
    Array.from({ length: 9 }, (_, i) => [
      String(i + 1),
      () => store.jumpToLine(i),
    ])
  ),
}), [store]);

useKeyboardShortcuts(shortcuts);
```

## 測試要求
- `useKeyboardShortcuts.test.ts`：
  - 按下定義的快捷鍵 → callback 被呼叫
  - 焦點在 input 時 → callback 不被呼叫
  - enabled=false 時 → callback 不被呼叫
  - unmount 後 → listener 被移除
- 使用 jsdom + fireEvent（或直接 dispatchEvent）

## 驗收標準
- [ ] Controller 頁面支援所有定義的快捷鍵
- [ ] 輸入框內打字不觸發快捷鍵
- [ ] Hook 有獨立單元測試且通過
- [ ] 不影響 Display 頁面現有 F 鍵功能
- [ ] npx vitest run 通過
- [ ] npm run build 通過

## Commit
```
feat(controller): add keyboard shortcuts for lyrics navigation and playback
```
