"use client";

import { type FC, useState, useRef, useCallback, useEffect } from "react";
import type {
  LyricsSearchRequest,
  LyricsSearchResponse,
  LyricsSearchResultItem,
  LyricsDetailResponse,
} from "@/lib/api/lyrics-search";
import { searchLyrics, getLyricsDetail } from "@/lib/api/lyrics-search";
import { convertToTraditional } from "@/lib/utils/chinese-converter";
import { createSong } from "@/lib/api/songs";
import { LyricsSearchInput } from "./LyricsSearchInput";
import { LyricsSearchResults } from "./LyricsSearchResults";
import { LyricsPreviewModal } from "./LyricsPreviewModal";
import { useTranslations } from "next-intl";

interface LyricsSearchPanelProps {
  onSongAdded: () => void;
  onClose: () => void;
}

export const LyricsSearchPanel: FC<LyricsSearchPanelProps> = ({ onSongAdded, onClose }) => {
  const t = useTranslations("lyricsSearch");
  const [searchResponse, setSearchResponse] = useState<LyricsSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 預覽 Modal 狀態
  const [previewLyrics, setPreviewLyrics] = useState<LyricsDetailResponse | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const handleSearch = useCallback(async (req: LyricsSearchRequest) => {
    // 取消上一次未完成的搜尋
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setError(null);

    try {
      const resp = await searchLyrics(req, controller.signal);
      setSearchResponse(resp);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : t("searchFailed"));
    } finally {
      setIsSearching(false);
    }
  }, [t]);

  // 組件 unmount 時取消進行中的搜尋請求
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleSelectResult = useCallback(async (result: LyricsSearchResultItem) => {
    setIsPreviewOpen(true);
    setIsLoadingLyrics(true);
    setPreviewLyrics(null);

    try {
      const detail = await getLyricsDetail(result.id);
      setPreviewLyrics(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("preview.getLyricsFailed"));
      setIsPreviewOpen(false);
    } finally {
      setIsLoadingLyrics(false);
    }
  }, [t]);

  const handleImport = useCallback(async (lyrics: LyricsDetailResponse, convertToTrad: boolean) => {
    try {
      const lyricsText = lyrics.syncedLyrics || lyrics.plainLyrics || "";
      const text = convertToTrad ? convertToTraditional(lyricsText) : lyricsText;

      // 解析歌詞行
      const lines = text.split("\n").filter((line) => line.trim());
      const lyricsArr: string[] = [];
      const timestamps: number[] = [];

      for (const line of lines) {
        const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)$/);
        if (match) {
          const mins = parseInt(match[1] ?? "0", 10);
          const secs = parseInt(match[2] ?? "0", 10);
          const ms = parseInt((match[3] ?? "0").padEnd(3, "0"), 10);
          timestamps.push(mins * 60 + secs + ms / 1000);
          lyricsArr.push(match[4] ?? "");
        } else {
          lyricsArr.push(line);
        }
      }

      const title = convertToTrad ? convertToTraditional(lyrics.title) : lyrics.title;
      const artist = convertToTrad ? convertToTraditional(lyrics.artist) : lyrics.artist;

      await createSong({
        title,
        artist,
        lyrics: lyricsArr,
        ...(timestamps.length === lyricsArr.length ? { lrcTimestamps: timestamps } : {}),
      });

      setIsPreviewOpen(false);
      onSongAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("preview.importFailed"));
    }
  }, [onSongAdded, onClose, t]);

  const handleReSearch = useCallback((title: string, artist: string) => {
    handleSearch({ query: title, searchType: "title", artist });
  }, [handleSearch]);

  return (
    <div className="space-y-4">
      <LyricsSearchInput onSearch={handleSearch} isLoading={isSearching} />

      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-[13px] text-red-400 font-mono">
          {error}
        </div>
      )}

      <LyricsSearchResults
        response={searchResponse}
        isLoading={isSearching}
        onSelect={handleSelectResult}
      />

      <LyricsPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        lyrics={previewLyrics}
        isLoading={isLoadingLyrics}
        onImport={handleImport}
        onReSearch={handleReSearch}
      />
    </div>
  );
};
