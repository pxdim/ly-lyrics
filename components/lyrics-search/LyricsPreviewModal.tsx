"use client";

import { type FC, useState, useEffect, useCallback } from "react";
import type { LyricsDetailResponse } from "@/lib/api/lyrics-search";
import { convertToTraditional } from "@/lib/utils/chinese-converter";
import { SimplifiedToggle } from "./SimplifiedToggle";

interface LyricsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lyrics: LyricsDetailResponse | null;
  isLoading: boolean;
  onImport: (lyrics: LyricsDetailResponse, convertToTrad: boolean) => void;
}

export const LyricsPreviewModal: FC<LyricsPreviewModalProps> = ({
  isOpen,
  onClose,
  lyrics,
  isLoading,
  onImport,
}) => {
  const [isTraditional, setIsTraditional] = useState(false);

  // 重置切換狀態
  useEffect(() => {
    if (isOpen) setIsTraditional(false);
  }, [isOpen]);

  // ESC 關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const displayLyrics = useCallback(() => {
    if (!lyrics) return "";
    const text = lyrics.syncedLyrics || lyrics.plainLyrics || "";
    return isTraditional ? convertToTraditional(text) : text;
  }, [lyrics, isTraditional]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg mx-4 bg-[#16181D] border border-[#2A2D35] max-h-[85vh] flex flex-col overflow-hidden">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2D35] bg-[#090A0C]">
          <span className="font-mono text-[13px] font-semibold uppercase tracking-wider text-primary">
            歌詞預覽
          </span>
          <button onClick={onClose} type="button" className="p-1.5 border border-[#2A2D35] hover:bg-primary/10 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#6B7280]">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-[#6B7280] text-[13px] font-mono">
            載入中...
          </div>
        ) : lyrics ? (
          <>
            {/* 歌曲資訊 */}
            <div className="px-5 py-3 border-b border-[#2A2D35]">
              <div className="text-[14px] text-[#E4E7EB] font-medium">
                {isTraditional ? convertToTraditional(lyrics.title) : lyrics.title}
                <span className="text-[#6B7280] mx-2">—</span>
                {isTraditional ? convertToTraditional(lyrics.artist) : lyrics.artist}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px] text-[#6B7280] font-mono">來源：{lyrics.source}</span>
                {lyrics.syncedLyrics && <span className="text-[11px] text-primary/70">⏱ 有時間戳</span>}
                {lyrics.isSimplified && (
                  <SimplifiedToggle isTraditional={isTraditional} onToggle={() => setIsTraditional(!isTraditional)} />
                )}
              </div>
            </div>

            {/* 歌詞內容 */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <pre className="text-[13px] text-[#C9CDD3] font-body whitespace-pre-wrap leading-relaxed">
                {displayLyrics()}
              </pre>
            </div>

            {/* 按鈕列 */}
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[#2A2D35] bg-[#090A0C]/50">
              <button onClick={onClose} type="button" className="px-4 py-2 border border-[#2A2D35] text-[13px] text-[#6B7280] hover:bg-[#16181D] transition-colors font-mono">
                取消
              </button>
              <button
                type="button"
                onClick={() => onImport(lyrics, isTraditional)}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/40 text-[13px] text-primary font-semibold hover:bg-primary/20 transition-colors font-mono"
              >
                ✅ 匯入到歌單
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12 text-[#6B7280] text-[13px] font-mono">
            無歌詞資料
          </div>
        )}
      </div>
    </div>
  );
};
