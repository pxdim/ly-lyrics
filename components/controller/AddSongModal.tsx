/**
 * 新增歌曲對話框
 *
 * 支援手動輸入歌名、歌手、歌詞（一行一句）。
 */

"use client";

import { type FC, useState, useRef, useEffect } from "react";
import { X, Plus, Music } from "lucide-react";
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
      <div className="relative w-full max-w-lg mx-4 bg-elevated border border-border-primary rounded-xl overflow-hidden shadow-glow-md">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-dim bg-void/50">
          <div className="flex items-center gap-2">
            <Music size={16} className="text-primary" />
            <span className="font-heading text-sm font-semibold uppercase tracking-wider text-primary">
              新增歌曲
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border-dim hover:bg-primary/10 hover:border-primary/30 transition-colors"
            type="button"
          >
            <X size={14} className="text-text-muted" />
          </button>
        </div>

        {/* 表單 */}
        <div className="p-5 space-y-4">
          {/* 歌名 */}
          <div>
            <label className="block font-body text-xs text-text-muted uppercase tracking-wider mb-1.5">
              歌曲名稱 *
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="輸入歌曲名稱..."
              className="w-full px-3 py-2 bg-void/50 border border-border-dim rounded-lg text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-primary/50 transition-colors font-body"
            />
          </div>

          {/* 歌手 */}
          <div>
            <label className="block font-body text-xs text-text-muted uppercase tracking-wider mb-1.5">
              歌手
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="輸入歌手名稱（選填）..."
              className="w-full px-3 py-2 bg-void/50 border border-border-dim rounded-lg text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-primary/50 transition-colors font-body"
            />
          </div>

          {/* 歌詞 */}
          <div>
            <label className="block font-body text-xs text-text-muted uppercase tracking-wider mb-1.5">
              歌詞 *（一行一句）
            </label>
            <textarea
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              placeholder={"第一行歌詞\n第二行歌詞\n第三行歌詞\n..."}
              rows={10}
              className="w-full px-3 py-2 bg-void/50 border border-border-dim rounded-lg text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-primary/50 transition-colors font-body resize-y"
            />
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 font-body">
              {error}
            </div>
          )}
        </div>

        {/* 按鈕列 */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-border-dim bg-void/30">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border-dim text-sm text-text-muted hover:bg-elevated transition-colors font-body"
            type="button"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/40 text-sm text-primary font-semibold hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body"
            type="button"
          >
            <Plus size={14} />
            {isSubmitting ? "建立中..." : "新增歌曲"}
          </button>
        </div>
      </div>
    </div>
  );
};
