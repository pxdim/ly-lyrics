# S06: LRC 匯入 UI（拖放上傳）

## 目標
建立 LRC 檔案拖放上傳元件，解析 .lrc 檔案後自動建立歌曲（呼叫 API 建歌）。

## 參考檔案（請先讀取）
- `lib/lrc/parser.ts` — `parseLRC()`, `lrcLinesToLyrics()`, `lrcLinesToTimestamps()`
- `lib/api/songs.ts` — `createSong()` API 函式
- `app/controller/page.tsx` — Controller 頁面，找到歌曲庫面板

## 新建檔案
- `components/lrc/LrcDropZone.tsx` — 拖放上傳元件
- `components/lrc/LrcDropZone.test.ts` — 測試檔案

## 修改檔案
- `app/controller/page.tsx` — 在歌曲庫面板加入 LrcDropZone

## 實作細節

### LrcDropZone 元件
```tsx
"use client";

import { useState, useCallback, type DragEvent } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { parseLRC, lrcLinesToLyrics, lrcLinesToTimestamps } from "@/lib/lrc/parser";
import { createSong } from "@/lib/api/songs";

interface LrcDropZoneProps {
  onImportSuccess?: () => void;  // 匯入成功後的回呼（刷新歌曲列表）
}

export function LrcDropZone({ onImportSuccess }: LrcDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "parsing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".lrc")) {
      setStatus("error");
      setMessage("請上傳 .lrc 格式的檔案");
      return;
    }

    setStatus("parsing");
    try {
      const text = await file.text();
      const lrcFile = parseLRC(text);
      const lyrics = lrcLinesToLyrics(lrcFile.lines);
      const timestamps = lrcLinesToTimestamps(lrcFile.lines);

      if (lyrics.length === 0) {
        setStatus("error");
        setMessage("LRC 檔案中沒有歌詞內容");
        return;
      }

      const title = lrcFile.metadata.ti || file.name.replace(".lrc", "");
      const artist = lrcFile.metadata.ar || null;

      await createSong({
        title,
        artist,
        lyrics,
        lrcTimestamps: timestamps.length > 0 ? timestamps : undefined,
      });

      setStatus("success");
      setMessage(`已成功匯入「${title}」`);
      onImportSuccess?.();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "匯入失敗");
    }
  }, [onImportSuccess]);

  // ... drag event handlers (onDragOver, onDragEnter, onDragLeave, onDrop)
  // Drop handler: e.preventDefault() + e.dataTransfer.files[0] → handleFile()

  return (
    <div
      onDragOver={...}
      onDragEnter={...}
      onDragLeave={...}
      onDrop={...}
      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors
        ${isDragging ? "border-cyan-400 bg-cyan-900/20" : "border-gray-600 hover:border-gray-500"}`}
    >
      {/* 根據 status 顯示不同內容：idle=Upload icon、parsing=spinner、success=check、error=alert */}
    </div>
  );
}
```

### 也支援點擊選檔
加一個隱藏的 `<input type="file" accept=".lrc">` + 點擊觸發。

## 測試要求
- 測試 `parseLRC` → `lrcLinesToLyrics` 的串接邏輯（已在 parser.test.ts 中覆蓋）
- LrcDropZone 元件測試可選（DOM 測試比較複雜，建議 E2E 覆蓋）

## 驗收標準
- [ ] LrcDropZone 元件可正常渲染
- [ ] 拖放 .lrc 檔案可解析並建歌
- [ ] 非 .lrc 檔案顯示錯誤
- [ ] 空歌詞 .lrc 顯示錯誤
- [ ] 成功後顯示歌名確認
- [ ] Dark Tech 設計風格
- [ ] npm run build 通過
- [ ] npx vitest run 通過

## Commit
```
feat(lrc): add drag-and-drop LRC import with auto song creation
```
