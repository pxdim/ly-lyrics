"use client";

import { type FC } from "react";
import type { LyricsSearchResultItem, LyricsSearchResponse } from "@/lib/api/lyrics-search";
import { LyricsResultCard } from "./LyricsResultCard";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("lyricsSearch");
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-text-muted text-[13px] font-mono">
        {t("searching")}
      </div>
    );
  }

  if (!response) return null;

  if (response.totalResults === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-[13px] font-mono">
        {t("noResults")}
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
          {t("resultCount", { count: response.totalResults })}
        </span>
        {pendingSources.length > 0 && (
          <span className="text-[11px] text-yellow-400/70 font-mono">
            {t("timeout")}: {pendingSources.join(", ")} ⏳
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
