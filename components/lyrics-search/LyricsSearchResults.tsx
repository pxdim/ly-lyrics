"use client";

import { type FC } from "react";
import type { LyricsSearchResultItem, LyricsSearchResponse } from "@/lib/api/lyrics-search";
import { LyricsResultCard } from "./LyricsResultCard";

interface LyricsSearchResultsProps {
  response: LyricsSearchResponse | null;
  isLoading: boolean;
  onSelect: (result: LyricsSearchResultItem) => void;
}

export const LyricsSearchResults: FC<LyricsSearchResultsProps> = ({
  response,
  isLoading,
  onSelect,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-text-muted text-[13px] font-mono">
        搜尋中...
      </div>
    );
  }

  if (!response) return null;

  if (response.totalResults === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-[13px] font-mono">
        找不到結果，請嘗試其他關鍵字
      </div>
    );
  }

  // 載入中的來源提示
  const pendingSources = Object.entries(response.sources)
    .filter(([, s]) => s.status === "timeout")
    .map(([name]) => name);

  return (
    <div>
      <div className="flex items-center justify-between px-1 py-2">
        <span className="text-[11px] text-text-muted font-mono">
          搜尋結果（{response.totalResults} 筆）
        </span>
        {pendingSources.length > 0 && (
          <span className="text-[11px] text-yellow-400/70 font-mono">
            逾時: {pendingSources.join(", ")} ⏳
          </span>
        )}
      </div>
      <div className="space-y-1">
        {response.results.map((result) => (
          <LyricsResultCard key={result.id} result={result} onClick={onSelect} />
        ))}
      </div>
    </div>
  );
};
