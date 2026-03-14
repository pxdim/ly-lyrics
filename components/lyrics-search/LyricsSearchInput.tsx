"use client";

import { type FC, useState, useRef, useEffect, useCallback } from "react";
import type { LyricsSearchRequest } from "@/lib/api/lyrics-search";

type SearchType = "title" | "artist" | "lyrics";

const searchTypeConfig: Record<SearchType, { label: string; placeholder: string; showArtist: boolean }> = {
  title:  { label: "歌曲名", placeholder: "輸入歌曲名稱...",   showArtist: true },
  artist: { label: "歌手",   placeholder: "輸入歌手名稱...",   showArtist: false },
  lyrics: { label: "歌詞",   placeholder: "輸入歌詞片段...",   showArtist: true },
};

interface LyricsSearchInputProps {
  onSearch: (req: LyricsSearchRequest) => void;
  isLoading: boolean;
}

export const LyricsSearchInput: FC<LyricsSearchInputProps> = ({ onSearch, isLoading }) => {
  const [searchType, setSearchType] = useState<SearchType>("title");
  const [query, setQuery] = useState("");
  const [artist, setArtist] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = searchTypeConfig[searchType];

  // 自動聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const triggerSearch = useCallback((q: string, a: string, st: SearchType) => {
    if (q.trim().length < 2) return;
    const req: LyricsSearchRequest = { query: q.trim(), searchType: st };
    if (a.trim() && searchTypeConfig[st].showArtist) {
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
    "w-full px-3 py-2 bg-[#090A0C] border border-[#2A2D35] text-[13px] text-[#E4E7EB] placeholder:text-[#6B7280] focus:outline-none focus:border-primary/50 transition-colors font-body rounded-none";

  return (
    <div className="space-y-3">
      {/* 搜尋類型 Radio */}
      <div className="flex items-center gap-4">
        <span className="text-[11px] text-[#6B7280] font-mono uppercase tracking-wider">搜尋類型:</span>
        {(Object.keys(searchTypeConfig) as SearchType[]).map((type_) => (
          <label key={type_} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="searchType"
              value={type_}
              checked={searchType === type_}
              onChange={() => setSearchType(type_)}
              className="accent-primary"
            />
            <span className={`text-[12px] ${searchType === type_ ? "text-primary" : "text-[#9CA3AF]"}`}>
              {searchTypeConfig[type_].label}
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
          placeholder={config.placeholder}
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
          <label className="block font-mono text-[11px] text-[#6B7280] uppercase tracking-wider mb-1">
            Artist (optional)
          </label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入歌手名稱（選填）..."
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
};
