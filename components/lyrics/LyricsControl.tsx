/**
 * LyricsControl Component
 *
 * 歌詞導覽控制列，提供前/後按鈕、行選擇器、全螢幕切換。
 * 設計系統 v2.0 — Neon Brutalist Glass
 *
 * 設計系統合規：
 * - 零硬編碼 hex/rgba — 全部使用 Tailwind token
 * - 零 onMouseEnter/Leave — 使用 Tailwind hover: class
 * - 字體使用 font-body（Noto Sans TC）
 * - 響應式使用 Tailwind md: 前綴取代 isMobile JS 判斷
 */

"use client";

import { type FC, useCallback } from "react";
import { ChevronUp, ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { useLyricsStore } from "@/lib/store";
import { useDebouncedCallback } from "@/lib/hooks/useDebounce";
import { ControlModeToggle } from "./ControlModeToggle";

export interface LyricsControlProps {
  /** 自訂 CSS class */
  className?: string;
  /** 精簡模式（僅按鈕 + 行數指示） */
  compact?: boolean;
  /** 控制列位置 */
  position?: "top" | "bottom" | "floating";
  /** 是否全螢幕 */
  isFullscreen?: boolean;
  /** 全螢幕切換回呼 */
  onToggleFullscreen?: (() => void) | undefined;
}

// 位置對應 class
const positionClasses: Record<string, string> = {
  top: "sticky top-0 z-50",
  bottom: "sticky bottom-0 z-50",
  floating: "fixed bottom-8 left-1/2 -translate-x-1/2 z-50",
};

// 導覽按鈕共用 class（enabled 狀態）
const NAV_BTN_BASE = [
  "flex items-center justify-center",
  "w-9 h-9 md:w-11 md:h-11",
  "rounded-full",
  "border border-[hsl(var(--color-glow-primary)/0.3)]",
  "bg-[hsl(var(--color-glow-primary)/0.1)]",
  "text-primary",
  "cursor-pointer",
  "transition-all duration-200 ease-out",
  "enabled:hover:bg-[hsl(var(--color-glow-primary)/0.2)]",
  "enabled:hover:shadow-glow-sm",
].join(" ");

// 導覽按鈕 disabled 狀態 class
const NAV_BTN_DISABLED = [
  "flex items-center justify-center",
  "w-9 h-9 md:w-11 md:h-11",
  "rounded-full",
  "border border-white/10",
  "bg-white/5",
  "text-white/30",
  "opacity-30",
  "cursor-not-allowed",
  "transition-all duration-200 ease-out",
].join(" ");

export const LyricsControl: FC<LyricsControlProps> = ({
  className = "",
  compact = false,
  position = "bottom",
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const currentIndex = useLyricsStore((state) => state.currentIndex);
  const lyrics = useLyricsStore((state) => state.lyrics);
  const nextLine = useLyricsStore((state) => state.nextLine);
  const prevLine = useLyricsStore((state) => state.prevLine);
  const jumpToLine = useLyricsStore((state) => state.jumpToLine);
  const controlMode = useLyricsStore((state) => state.controlMode);
  const setControlMode = useLyricsStore((state) => state.setControlMode);

  const totalLines = lyrics.length;
  const canGoNext = currentIndex < totalLines - 1;
  const canGoPrev = currentIndex > 0;

  // 防抖處理：避免快速連點導致過多 WebSocket 訊息
  const handlePrev = useDebouncedCallback(
    useCallback(() => {
      if (canGoPrev) {
        prevLine();
      }
    }, [canGoPrev, prevLine]),
    150
  );

  const handleNext = useDebouncedCallback(
    useCallback(() => {
      if (canGoNext) {
        nextLine();
      }
    }, [canGoNext, nextLine]),
    150
  );

  const handleJump = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(e.target.value, 10);
    jumpToLine(index);
  };

  // 空狀態：無歌詞時不渲染
  if (totalLines === 0) {
    return null;
  }

  return (
    <div
      className={[
        "lyrics-control",
        "flex items-center",
        "gap-2 md:gap-4",
        "px-4 py-2.5 md:px-6 md:py-4",
        "bg-void/90 backdrop-blur-[12px]",
        "rounded-full",
        "shadow-[0_0_10px_hsl(var(--color-glow-primary)/0.2)]",
        "border border-[hsl(var(--color-glow-primary)/0.3)]",
        "transition-all duration-200 ease-out",
        positionClasses[position] ?? "",
        className,
      ].join(" ")}
    >
      {/* Previous Button */}
      <button
        className={`group ${canGoPrev ? NAV_BTN_BASE : NAV_BTN_DISABLED}`}
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label="Previous line"
        title="Previous line (Arrow Up)"
        type="button"
      >
        <ChevronUp
          size={20}
          strokeWidth={2.5}
          className="transition-transform duration-200 group-hover:-translate-y-0.5"
        />
      </button>

      {/* 行選擇器 — compact 模式隱藏 */}
      {!compact && (
        <div className="relative">
          <select
            className={[
              "py-2 pr-8 pl-3 md:py-2.5 md:pr-10 md:pl-4",
              "rounded-lg",
              "border border-[hsl(var(--color-glow-primary)/0.3)]",
              "bg-void/80",
              "text-[hsl(var(--color-text-primary))]",
              "text-xs md:text-sm",
              "font-body",
              "cursor-pointer",
              "appearance-none",
              "min-w-[100px] md:min-w-[140px]",
              "transition-all duration-200 ease-out",
            ].join(" ")}
            style={{
              // SVG 自訂箭頭必須保留 inline（Tailwind 不支援 data URI）
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23FF6B00'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.625rem center",
              backgroundSize: "1rem",
            }}
            value={currentIndex}
            onChange={handleJump}
            aria-label="Jump to line"
          >
            {Array.from({ length: totalLines }, (_, i) => (
              <option key={i} value={i}>
                Line {i + 1} of {totalLines}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 行數指示（compact 模式） */}
      {compact && (
        <span className="font-mono text-sm text-primary font-medium min-w-[60px] text-center">
          {currentIndex + 1}/{totalLines}
        </span>
      )}

      {/* Next Button */}
      <button
        className={`group ${canGoNext ? NAV_BTN_BASE : NAV_BTN_DISABLED}`}
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Next line"
        title="Next line (Arrow Down)"
        type="button"
      >
        <ChevronDown
          size={20}
          strokeWidth={2.5}
          className="transition-transform duration-200 group-hover:translate-y-0.5"
        />
      </button>

      {/* 分隔線 — Toggle 前 */}
      <div className="w-px h-7 bg-[hsl(var(--color-glow-primary)/0.3)] mx-1" />

      {/* 自動／手動模式切換 */}
      <ControlModeToggle
        mode={controlMode}
        onToggle={setControlMode}
      />

      {/* 全螢幕切換（僅在有回呼時顯示） */}
      {onToggleFullscreen && (
        <>
          {/* 分隔線 */}
          <div className="w-px h-7 bg-[hsl(var(--color-glow-primary)/0.3)] mx-1" />

          <button
            className={`group ${NAV_BTN_BASE}`}
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "退出全螢幕 (F)" : "全螢幕 (F)"}
            type="button"
          >
            {isFullscreen ? (
              <Minimize2 size={18} strokeWidth={2} className="transition-transform duration-200" />
            ) : (
              <Maximize2 size={18} strokeWidth={2} className="transition-transform duration-200" />
            )}
          </button>
        </>
      )}
    </div>
  );
};
