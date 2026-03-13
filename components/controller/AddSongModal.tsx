/**
 * 新增歌曲對話框 — Broadcast Console 風格
 *
 * 支援手動輸入歌名、歌手、歌詞（一行一句）。
 */

"use client";

import { type FC, useState, useRef, useEffect } from "react";
import { createSong } from "@/lib/api/songs";

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSongAdded: () => void;
}

export const AddSongModal: FC<AddSongModalProps> = ({ isOpen, onClose, onSongAdded }) => {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [lyricsText, setLyricsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // 開啟時聚焦到歌名輸入框
  useEffect(() => {
    if (isOpen) {
      titleRef.current?.focus();
      setTitle("");
      setArtist("");
      setLyricsText("");
      setError(null);
    }
  }, [isOpen]);

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
      setError("請輸入歌曲名稱");
      return;
    }

    const lyrics = lyricsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lyrics.length === 0) {
      setError("請輸入至少一行歌詞");
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
      setError(err instanceof Error ? err.message : "建立歌曲失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full px-3 py-2 bg-[#090A0C] border border-[#2A2D35] text-[13px] text-[#E4E7EB] placeholder:text-[#6B7280] focus:outline-none focus:border-primary/50 transition-colors font-body rounded-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* 對話框 */}
      <div className="relative w-full max-w-lg mx-4 bg-[#16181D] border border-[#2A2D35] overflow-hidden">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2D35] bg-[#090A0C]">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            <span className="font-mono text-[13px] font-semibold uppercase tracking-wider text-primary">
              Add Track
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border border-[#2A2D35] hover:bg-primary/10 hover:border-primary/30 transition-colors"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#6B7280]">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 表單 */}
        <div className="p-5 space-y-4">
          {/* 歌名 */}
          <div>
            <label className="block font-mono text-[11px] text-[#6B7280] uppercase tracking-wider mb-1.5">
              Title *
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="輸入歌曲名稱..."
              className={inputClass}
            />
          </div>

          {/* 歌手 */}
          <div>
            <label className="block font-mono text-[11px] text-[#6B7280] uppercase tracking-wider mb-1.5">
              Artist
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="輸入歌手名稱（選填）..."
              className={inputClass}
            />
          </div>

          {/* 歌詞 */}
          <div>
            <label className="block font-mono text-[11px] text-[#6B7280] uppercase tracking-wider mb-1.5">
              Lyrics * (one line per cue)
            </label>
            <textarea
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              placeholder={"第一行歌詞\n第二行歌詞\n第三行歌詞\n..."}
              rows={10}
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
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[#2A2D35] bg-[#090A0C]/50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#2A2D35] text-[13px] text-[#6B7280] hover:bg-[#16181D] transition-colors font-mono"
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
      </div>
    </div>
  );
};
