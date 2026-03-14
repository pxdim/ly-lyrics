"use client";

import { type FC } from "react";
import type { LyricsSearchResultItem } from "@/lib/api/lyrics-search";

// 可信度標記顏色
const confidenceDots: Record<string, string> = {
  high: "bg-green-400",
  medium: "bg-yellow-400",
  low: "bg-orange-400",
};

// 來源顯示名稱
function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    lrclib: "LRClib",
    "lrcapi-kugou": "酷狗",
    "lrcapi-netease": "網易雲",
    "lrcapi-migu": "咪咕",
    genius: "Genius",
    gemini: "AI 搜尋",
  };
  return map[source] ?? source;
}

interface LyricsResultCardProps {
  result: LyricsSearchResultItem;
  onClick: (result: LyricsSearchResultItem) => void;
}

export const LyricsResultCard: FC<LyricsResultCardProps> = ({ result, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(result)}
      className="w-full text-left px-4 py-3 border border-[#2A2D35] hover:bg-[#1E2028] hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* 歌名 + 歌手 */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${confidenceDots[result.confidence]}`} />
            <span className="text-[13px] text-[#E4E7EB] font-medium truncate">
              {result.title}
            </span>
            <span className="text-[12px] text-[#6B7280]">—</span>
            <span className="text-[12px] text-[#9CA3AF] truncate">
              {result.artist}
            </span>
          </div>
          {/* 來源 + 標記 */}
          <div className="flex items-center gap-2 mt-1 ml-4">
            <span className="text-[11px] text-[#6B7280] font-mono">
              {sourceLabel(result.source)}
            </span>
            {result.hasSyncedLyrics && (
              <span className="text-[11px] text-primary/70">⏱ 有時間戳</span>
            )}
            {!result.hasSyncedLyrics && result.hasPlainLyrics && (
              <span className="text-[11px] text-[#6B7280]">📝 純文字</span>
            )}
            {!result.hasSyncedLyrics && !result.hasPlainLyrics && (
              <span className="text-[11px] text-[#6B7280]/60">ℹ️ 僅資訊</span>
            )}
            {result.duration && (
              <span className="text-[11px] text-[#6B7280]">
                {Math.floor(result.duration / 60)}:{String(result.duration % 60).padStart(2, "0")}
              </span>
            )}
            {result.ratio != null && (
              <span className="text-[11px] text-[#6B7280]">
                相似度 {Math.round(result.ratio * 100)}%
              </span>
            )}
            {result.isAiGenerated && (
              <span className="text-[11px] text-orange-400/70">🤖 AI 生成</span>
            )}
          </div>
        </div>
        {/* 簡體標記 */}
        {result.isSimplified && (
          <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono">
            簡
          </span>
        )}
      </div>
    </button>
  );
};
