/**
 * LRC 匯入邏輯
 *
 * 處理 .lrc 檔案的讀取、解析、驗證，並呼叫 API 建立歌曲。
 * 將核心邏輯從 UI 元件中抽離，方便獨立測試。
 *
 * @module lib/lrc/import
 */

import { parseLRC, lrcLinesToLyrics, lrcLinesToTimestamps } from "@/lib/lrc/parser";
import { createSong, type ClientSong } from "@/lib/api/songs";

// ============================================================================
// Types
// ============================================================================

/** LRC 匯入專用錯誤，用於區分使用者可讀的驗證錯誤 */
export class LrcImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LrcImportError";
  }
}

/** 匯入成功的回傳結果 */
export interface LrcImportResult {
  /** API 回傳的歌曲物件 */
  song: ClientSong;
  /** 匯入的歌曲標題 */
  title: string;
  /** 歌詞行數 */
  lyricsCount: number;
  /** 是否包含時間戳 */
  hasTimestamps: boolean;
}

// ============================================================================
// 核心邏輯
// ============================================================================

/**
 * 處理 LRC 檔案匯入
 *
 * 流程：驗證副檔名 → 讀取文字 → 解析 LRC → 驗證歌詞 → 提取 metadata → 呼叫 API
 *
 * @param file - 使用者上傳的 File 物件
 * @returns 匯入結果（含歌曲物件、標題、行數、時間戳資訊）
 * @throws {LrcImportError} 檔案格式錯誤或歌詞為空
 * @throws {Error} API 呼叫失敗
 */
export async function processLrcFile(file: File): Promise<LrcImportResult> {
  // 驗證副檔名
  if (!file.name.endsWith(".lrc")) {
    throw new LrcImportError("請上傳 .lrc 格式的檔案");
  }

  // 讀取並解析 LRC 內容
  const text = await file.text();
  const lrcFile = parseLRC(text);
  const lyrics = lrcLinesToLyrics(lrcFile.lines);
  const timestamps = lrcLinesToTimestamps(lrcFile.lines);

  // 驗證歌詞不為空
  if (lyrics.length === 0) {
    throw new LrcImportError("LRC 檔案中沒有歌詞內容");
  }

  // 從 metadata 提取標題和歌手（metadata 的 key 已被 normalizeMetadataKey 正規化）
  const title = lrcFile.metadata.title || file.name.replace(/\.lrc$/i, "");
  const artist = lrcFile.metadata.artist;

  // 組裝 API 參數（exactOptionalPropertyTypes 不允許顯式傳 undefined）
  const createData: Parameters<typeof createSong>[0] = { title, lyrics };
  if (artist) createData.artist = artist;
  if (timestamps.length > 0) createData.lrcTimestamps = timestamps;

  // 呼叫 API 建立歌曲
  const song = await createSong(createData);

  return {
    song,
    title,
    lyricsCount: lyrics.length,
    hasTimestamps: timestamps.length > 0,
  };
}
