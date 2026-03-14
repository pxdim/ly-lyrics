/**
 * LRC 匯出工具
 *
 * 將歌詞資料轉為 LRC 格式字串，並觸發瀏覽器下載。
 *
 * @module lib/lrc/export
 */

import { serializeLRC, toLrcLines, type LrcFile } from "./parser";

/**
 * 將歌詞和時間戳轉為 LRC 格式字串
 *
 * @param title - 歌曲標題
 * @param artist - 歌手名稱（null 時不寫入 metadata）
 * @param lyrics - 歌詞文字陣列
 * @param timestamps - 時間戳陣列（毫秒），無則使用預設 5 秒間隔
 * @returns LRC 格式字串
 */
export function generateLrcContent(
  title: string,
  artist: string | null,
  lyrics: string[],
  timestamps?: number[]
): string {
  const metadata = artist ? { title, artist } : { title };
  const lrcFile: LrcFile = {
    metadata,
    lines: toLrcLines(lyrics, timestamps),
  };
  return serializeLRC(lrcFile);
}

/**
 * 觸發瀏覽器下載 LRC 檔案
 *
 * @param content - LRC 檔案內容字串
 * @param filename - 檔案名稱（自動補上 .lrc 副檔名）
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
