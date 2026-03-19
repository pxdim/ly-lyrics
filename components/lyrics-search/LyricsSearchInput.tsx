"use client";

import { type FC, useState, useRef, useEffect, useCallback } from "react";
import type { LyricsSearchRequest } from "@/lib/api/lyrics-search";
import { useTranslations } from "next-intl";

type SearchType = "title" | "artist" | "lyrics";

/** 搜尋類型 → i18n key 對照（label/placeholder key 名稱） */
const searchTypeKeys: Record<SearchType, { labelKey: string; placeholderKey: string; showArtist: boolean }> = {
  title:  { labelKey: "titleType",    placeholderKey: "titlePlaceholder",  showArtist: true },
  artist: { labelKey: "artistType",   placeholderKey: "artistPlaceholder", showArtist: false },
  lyrics: { labelKey: "lyricsType",   placeholderKey: "lyricsPlaceholder", showArtist: true },
};

interface LyricsSearchInputProps {
  onSearch: (req: LyricsSearchRequest) => void;
  isLoading: boolean;
}

export const LyricsSearchInput: FC<LyricsSearchInputProps> = ({ onSearch, isLoading }) => {
  const t = useTranslations("lyricsSearch");
  const [searchType, setSearchType] = useState<SearchType>("title");
  const [query, setQuery] = useState("");
  const [artist, setArtist] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = searchTypeKeys[searchType];

  // 自動聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const triggerSearch = useCallback((q: string, a: string, st: SearchType) => {
    if (q.trim().length < 2) return;
    const req: LyricsSearchRequest = { query: q.trim(), searchType: st };
    if (a.trim() && searchTypeKeys[st].showArtist) {
      req.artist = a.trim();
    }
    onSearch(req);
  }, [onSearch]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerSearch(value, artist, searchType);
    }, 500);
  };

  const handleManualSearch = () => {
    triggerSearch(query, artist, searchType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      triggerSearch(query, artist, searchType);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-surface border border-border-dim text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors font-body rounded-none";

  return (
    <div className="space-y-3">
      {/* 搜尋類型 Radio */}
      <div className="flex items-center gap-4">
        <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">{t("searchType")}</span>
        {(Object.keys(searchTypeKeys) as SearchType[]).map((type_) => (
          <label key={type_} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="searchType"
              value={type_}
              checked={searchType === type_}
              onChange={() => setSearchType(type_)}
              className="accent-primary"
            />
            <span className={`text-[12px] ${searchType === type_ ? "text-primary" : "text-text-muted"}`}>
              {t(searchTypeKeys[type_].labelKey)}
            </span>
          </label>
        ))}
      </div>

      {/* 主搜尋框 */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t(config.placeholderKey)}
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={handleManualSearch}
          disabled={isLoading || query.trim().length < 2}
          className="px-3 py-2 bg-primary/10 border border-primary/40 text-primary text-[13px] font-mono hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "⏳" : "🔍"}
        </button>
      </div>

      {/* 歌手欄位（title 和 lyrics 模式顯示） */}
      {config.showArtist && (
        <div>
          <label className="block font-mono text-[11px] text-text-muted uppercase tracking-wider mb-1">
            {t("artistFieldLabel")}
          </label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("artistFieldPlaceholder")}
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
};
