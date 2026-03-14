/**
 * LyricsMatcher — 歌詞比對模組
 *
 * 使用 LCS（最長公共子序列）相似度 + 滑動視窗 + LRC 時間戳輔助
 * 將 STT 辨識出的文字片段對應到歌詞的行索引。
 */

export interface MatchConfig {
  /** 視窗內匹配所需的最低信心度 */
  confidenceThreshold: number;
  /** 滑動視窗：向前回溯的行數 */
  windowBefore: number;
  /** 滑動視窗：向後延伸的行數 */
  windowAfter: number;
  /** 全曲掃描時所需的最低信心度（高於視窗門檻以避免誤跳） */
  fullScanThreshold: number;
  /** 對 currentIndex 之後的行加分，用於重複副歌時優先選擇下一個出現位置 */
  forwardBias: number;
}

export interface MatchResult {
  /** 最佳匹配的歌詞行索引 */
  lineIndex: number;
  /** 信心度 (0-1)，已含 forwardBias 加成 */
  confidence: number;
}

/**
 * 計算兩個字串的 LCS 相似度比率 (0-1)
 *
 * 使用字元級 LCS，大小寫不敏感。
 * 比率定義：lcs長度 / max(a長度, b長度)
 */
export function lcsRatio(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0;

  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  const m = la.length;
  const n = lb.length;

  // 空間優化：只保留上一行與當前行，避免 O(m*n) 空間
  let prev = new Array<number>(n + 1).fill(0);
  let curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (la[i - 1] === lb[j - 1]) {
        curr[j] = (prev[j - 1] ?? 0) + 1;
      } else {
        curr[j] = Math.max(prev[j] ?? 0, curr[j - 1] ?? 0);
      }
    }
    // 交換行，重置 curr
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  const lcsLength = prev[n] ?? 0;
  return lcsLength / Math.max(m, n);
}

/**
 * 在歌詞中比對 STT 文字，回傳最佳匹配行索引和信心度
 *
 * 比對策略：
 * 1. 以 currentIndex 為中心，建立 [windowStart, windowEnd] 滑動視窗
 * 2. 若有 LRC 時間戳，進一步調整視窗範圍
 * 3. 在視窗內找最高分（forward 方向加 forwardBias 加成）
 * 4. 若視窗內最高分未達 confidenceThreshold，進行全曲掃描（需達 fullScanThreshold）
 *
 * @param text        STT 辨識出的文字片段
 * @param lyrics      歌詞行陣列
 * @param currentIndex 目前播放位置（行索引）
 * @param config      比對參數設定
 * @param timestamps  LRC 時間戳陣列（毫秒），長度必須與 lyrics 相同
 * @param elapsedMs   目前播放時間（毫秒）
 * @returns MatchResult 或 null（無匹配）
 */
export function matchLyrics(
  text: string,
  lyrics: string[],
  currentIndex: number,
  config: MatchConfig,
  timestamps?: number[],
  elapsedMs?: number
): MatchResult | null {
  // 邊界條件：空文字或空歌詞直接返回
  if (!text.trim() || lyrics.length === 0) return null;

  // Step 1: 計算基本滑動視窗範圍
  let windowStart = Math.max(0, currentIndex - config.windowBefore);
  let windowEnd = Math.min(lyrics.length - 1, currentIndex + config.windowAfter);

  // Step 2: LRC 時間戳輔助 — 根據播放時間擴展視窗
  if (timestamps && elapsedMs !== undefined && timestamps.length === lyrics.length) {
    const timeWindowMs = 5000;
    const timeStart = lyrics.findIndex((_, i) => (timestamps[i] ?? 0) >= elapsedMs - timeWindowMs);
    const timeEnd = lyrics.findIndex((_, i) => (timestamps[i] ?? 0) > elapsedMs + timeWindowMs);
    if (timeStart >= 0) {
      windowStart = Math.min(windowStart, timeStart);
    }
    if (timeEnd >= 0) {
      windowEnd = Math.max(windowEnd, timeEnd - 1);
    }
  }

  // Step 3: 在視窗內比對，forward 方向加 forwardBias 加成
  let bestInWindow: MatchResult | null = null;

  for (let i = windowStart; i <= windowEnd; i++) {
    const lyric = lyrics[i];
    if (lyric === undefined) continue;
    let score = lcsRatio(text, lyric);
    // 對 currentIndex 之後的行加分，處理重複副歌時優先往前推進
    if (i > currentIndex) {
      score += config.forwardBias;
    }
    if (score > (bestInWindow?.confidence ?? 0)) {
      bestInWindow = { lineIndex: i, confidence: score };
    }
  }

  // Step 4: 視窗內有達門檻的匹配，直接回傳
  if (bestInWindow && bestInWindow.confidence >= config.confidenceThreshold) {
    return bestInWindow;
  }

  // Step 5: 全曲掃描（跳過視窗範圍），使用更嚴格的門檻防止誤跳
  let bestFullScan: MatchResult | null = null;

  for (let i = 0; i < lyrics.length; i++) {
    // 視窗內已比對過，跳過
    if (i >= windowStart && i <= windowEnd) continue;
    const lyric = lyrics[i];
    if (lyric === undefined) continue;
    const score = lcsRatio(text, lyric);
    if (score > (bestFullScan?.confidence ?? 0)) {
      bestFullScan = { lineIndex: i, confidence: score };
    }
  }

  if (bestFullScan && bestFullScan.confidence >= config.fullScanThreshold) {
    return bestFullScan;
  }

  return null;
}
