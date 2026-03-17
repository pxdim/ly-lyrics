interface CalcVisibleLinesInput {
  currentIndex: number;
  totalLines: number;
  visibleCount: number;
}

interface CalcVisibleLinesResult {
  start: number;
  end: number;
}

/**
 * 計算可見行範圍（look-ahead bias：當前行置於上方 1/3 位置）
 * 供 LyricsDisplay 和 LivePreview 共用
 */
export function calcVisibleLines({
  currentIndex,
  totalLines,
  visibleCount,
}: CalcVisibleLinesInput): CalcVisibleLinesResult {
  if (totalLines === 0) {
    return { start: 0, end: 0 };
  }

  const effectiveVisible = Math.min(visibleCount, totalLines);

  // 當前行放在上方 1/3 位置
  const offset = Math.floor(effectiveVisible / 3);
  let start = currentIndex - offset;

  // 上下邊界限制
  if (start < 0) start = 0;
  if (start + effectiveVisible > totalLines) {
    start = totalLines - effectiveVisible;
  }
  if (start < 0) start = 0;

  return {
    start,
    end: start + effectiveVisible,
  };
}
