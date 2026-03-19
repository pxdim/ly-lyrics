"use client";

import { type FC } from "react";
import type { LyricsSearchResultItem } from "@/lib/api/lyrics-search";
import { useTranslations } from "next-intl";

// 可信度標記顏色
const confidenceDots: Record<string, string> = {
  high: "bg-green-400",
  medium: "bg-yellow-400",
  low: "bg-orange-400",
};

// 來源 key → i18n key 對照
const SOURCE_KEY_MAP: Record<string, string> = {
  lrclib: "lrclib",
  "lrcapi-kugou": "kugou",
  "lrcapi-netease": "netease",
  "lrcapi-migu": "migu",
  genius: "genius",
  gemini: "gemini",
};

interface LyricsResultCardProps {
  result: LyricsSearchResultItem;
  onClick: (result: LyricsSearchResultItem) => void;
}

export const LyricsResultCard: FC<LyricsResultCardProps> = ({ result, onClick }) => {
  const t = useTranslations("lyricsSearch");
  const tSource = useTranslations("lyricsSearch.sourceLabels");

  const sourceLabel = (source: string): string => {
    const key = SOURCE_KEY_MAP[source];
    return key ? tSource(key) : source;
  };

  return (
    <button
      type="button"
      onClick={() => onClick(result)}
      className="w-full text-left px-4 py-3 border border-border-dim hover:bg-elevated hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* 歌名 + 歌手 */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${confidenceDots[result.confidence]}`} />
            <span className="text-[13px] text-text-primary font-medium truncate">
              {result.title}
            </span>
            <span className="text-[12px] text-text-muted">—</span>
            <span className="text-[12px] text-text-muted truncate">
              {result.artist}
            </span>
          </div>
          {/* 來源 + 標記 */}
          <div className="flex items-center gap-2 mt-1 ml-4">
            <span className="text-[11px] text-text-muted font-mono">
              {sourceLabel(result.source)}
            </span>
            {result.hasSyncedLyrics && (
              <span className="text-[11px] text-primary/70">⏱ {t("hasSyncedLyrics")}</span>
            )}
            {!result.hasSyncedLyrics && result.hasPlainLyrics && (
              <span className="text-[11px] text-text-muted">📝 {t("plainText")}</span>
            )}
            {!result.hasSyncedLyrics && !result.hasPlainLyrics && (
              <span className="text-[11px] text-text-muted/60">ℹ️ {t("infoOnly")}</span>
            )}
            {result.duration && (
              <span className="text-[11px] text-text-muted">
                {Math.floor(result.duration / 60)}:{String(result.duration % 60).padStart(2, "0")}
              </span>
            )}
            {result.ratio != null && (
              <span className="text-[11px] text-text-muted">
                {t("similarity")} {Math.round(result.ratio * 100)}%
              </span>
            )}
            {result.isAiGenerated && (
              <span className="text-[11px] text-orange-400/70">🤖 {t("aiGenerated")}</span>
            )}
          </div>
        </div>
        {/* 簡體標記 */}
        {result.isSimplified && (
          <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono">
            {t("simplified")}
          </span>
        )}
      </div>
    </button>
  );
};
