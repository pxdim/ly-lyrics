# S05: LRC 匯出 UI

## 目標
在 Controller 頁面的歌曲面板加入「匯出 LRC」按鈕，讓使用者可以下載歌詞為 .lrc 檔案。

## 參考檔案（請先讀取）
- `lib/lrc/parser.ts` — `serializeLRC()`, `toLrcLines()`, `LrcFile` interface
- `app/controller/page.tsx` — Controller 頁面，找到歌曲選擇區域
- `lib/api/songs.ts` — `fetchSongById()` 取得歌曲完整資料（包含 lyrics + lrcTimestamps）

## 新建檔案
- `lib/lrc/export.ts` — LRC 匯出邏輯
- `lib/lrc/export.test.ts` — 匯出邏輯測試

## 修改檔案
- `app/controller/page.tsx` — 在歌曲詳情區域加入匯出按鈕

## 實作細節

### lib/lrc/export.ts
```typescript
import { serializeLRC, toLrcLines, type LrcFile } from "./parser";

/**
 * 將歌詞和時間戳轉為 LRC 格式字串
 */
export function generateLrcContent(
  title: string,
  artist: string | null,
  lyrics: string[],
  timestamps?: number[]
): string {
  const lrcFile: LrcFile = {
    metadata: {
      ti: title,
      ar: artist ?? undefined,
    },
    lines: toLrcLines(lyrics, timestamps),
  };
  return serializeLRC(lrcFile);
}

/**
 * 觸發瀏覽器下載 LRC 檔案
 */
export function downloadLrcFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".lrc") ? filename : `${filename}.lrc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Controller 整合
在已選歌曲的操作區域加入按鈕：
```tsx
<button
  onClick={() => {
    if (!currentSong) return;
    const content = generateLrcContent(
      currentSong.title,
      currentSong.artist,
      lyrics,
      currentSong.lrcTimestamps
    );
    downloadLrcFile(content, currentSong.title);
  }}
  className="... dark tech button style ..."
>
  <Download className="w-4 h-4" /> 匯出 LRC
</button>
```

使用 lucide-react 的 `Download` icon。

## 測試要求
- `export.test.ts`：
  - `generateLrcContent` 基本測試（有 timestamps vs 無 timestamps）
  - `generateLrcContent` 帶 metadata（title + artist）
  - 空歌詞陣列處理

## 驗收標準
- [ ] 匯出函式有單元測試且通過
- [ ] Controller 有匯出按鈕
- [ ] 無歌曲選擇時按鈕 disabled
- [ ] npx vitest run 通過
- [ ] npm run build 通過

## Commit
```
feat(lrc): add LRC export UI with download button on controller
```
