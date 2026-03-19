/**
 * 新增歌曲對話框 — Broadcast Console 風格
 *
 * 支援手動輸入歌名、歌手、歌詞（一行一句）。
 */

"use client";

import { type FC, useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { createSong } from "@/lib/api/songs";
import { LrcDropZone } from "@/components/lrc/LrcDropZone";
import { useTranslations } from "next-intl";

// 動態載入 loading fallback 元件（需使用 i18n hook）
function SearchLoadingFallback() {
  const t = useTranslations("controller.addSong");
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-[11px] font-mono text-text-muted">{t("loadingSearch")}</span>
    </div>
  );
}

// LyricsSearchPanel 攜帶 opencc-js 繁簡轉換字典（5.5MB），僅在搜尋歌詞 tab 時載入
const LyricsSearchPanel = dynamic(
  () => import("@/components/lyrics-search/LyricsSearchPanel").then((m) => ({ default: m.LyricsSearchPanel })),
  {
    ssr: false,
    loading: SearchLoadingFallback,
  },
);

export type AddSongTab = "search" | "manual" | "lrc";

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSongAdded: () => void;
  initialTab?: AddSongTab;
}

export const AddSongModal: FC<AddSongModalProps> = ({ isOpen, onClose, onSongAdded, initialTab = "search" }) => {
  const t = useTranslations("controller.addSong");
  const tLib = useTranslations("controller.library");
  const [activeTab, setActiveTab] = useState<"search" | "manual" | "lrc">("search");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [lyricsText, setLyricsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { key: "search" as const, label: `🔍 ${tLib("searchLyrics")}` },
    { key: "manual" as const, label: `✏️ ${tLib("manualInput")}` },
    { key: "lrc"    as const, label: `📄 ${tLib("importLRC")}` },
  ];

  // 偵測手機螢幕寬度，用於響應式調整
  const [isMobile, setIsMobile] = useState(false);
  const handleMediaChange = useCallback((e: MediaQueryListEvent | MediaQueryList) => {
    setIsMobile(e.matches);
  }, []);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    handleMediaChange(mql);
    mql.addEventListener("change", handleMediaChange);
    return () => mql.removeEventListener("change", handleMediaChange);
  }, [handleMediaChange]);

  // 開啟時重置狀態並聚焦到歌名輸入框
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      titleRef.current?.focus();
      setTitle("");
      setArtist("");
      setLyricsText("");
      setError(null);
    }
  }, [isOpen, initialTab]);

  // ESC 關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t("errorNoTitle"));
      return;
    }

    const lyrics = lyricsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lyrics.length === 0) {
      setError(t("errorNoLyrics"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data: Parameters<typeof createSong>[0] = { title: trimmedTitle, lyrics };
      const trimmedArtist = artist.trim();
      if (trimmedArtist) data.artist = trimmedArtist;
      await createSong(data);
      onSongAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full px-3 py-2 bg-surface border border-border-dim text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors font-body rounded-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-song-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* 對話框 */}
      <div className="relative w-full max-w-lg mx-4 bg-elevated border border-border-dim max-h-[85vh] overflow-y-auto">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-dim bg-surface">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            <span
              id="add-song-modal-title"
              className="font-mono text-[13px] font-semibold uppercase tracking-wider text-primary"
            >
              Add Track
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border border-border-dim hover:bg-primary/10 hover:border-primary/30 transition-colors"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab 切換列 */}
        <div className="flex border-b border-border-dim">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2.5 text-[12px] font-mono transition-colors ${
                activeTab === tab.key
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-text-muted hover:text-text-muted hover:bg-elevated"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 內容 */}
        {activeTab === "search" && (
          <div className="p-5">
            <LyricsSearchPanel onSongAdded={onSongAdded} onClose={onClose} />
          </div>
        )}

        {activeTab === "manual" && (
          <>
            {/* 表單 */}
            <div className="p-5 space-y-4">
              {/* 歌名 */}
              <div>
                <label className="block font-mono text-[11px] text-text-muted uppercase tracking-wider mb-1.5">
                  Title *
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  className={inputClass}
                />
              </div>

              {/* 歌手 */}
              <div>
                <label className="block font-mono text-[11px] text-text-muted uppercase tracking-wider mb-1.5">
                  Artist
                </label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder={t("artistPlaceholder")}
                  className={inputClass}
                />
              </div>

              {/* 歌詞 */}
              <div>
                <label className="block font-mono text-[11px] text-text-muted uppercase tracking-wider mb-1.5">
                  Lyrics * (one line per cue)
                </label>
                <textarea
                  value={lyricsText}
                  onChange={(e) => setLyricsText(e.target.value)}
                  placeholder={t("lyricsPlaceholder")}
                  rows={isMobile ? 6 : 10}
                  className={`${inputClass} resize-y`}
                />
              </div>

              {/* 錯誤訊息 */}
              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-[13px] text-red-400 font-mono">
                  {error}
                </div>
              )}
            </div>

            {/* 按鈕列 */}
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-border-dim bg-surface/50">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-border-dim text-[13px] text-text-muted hover:bg-elevated transition-colors font-mono"
                type="button"
              >
                CANCEL
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/40 text-[13px] text-primary font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {isSubmitting ? "ADDING..." : "ADD TRACK"}
              </button>
            </div>
          </>
        )}

        {activeTab === "lrc" && (
          <div className="p-5">
            <LrcDropZone onImportSuccess={() => { onSongAdded(); onClose(); }} />
          </div>
        )}
      </div>
    </div>
  );
};
