/**
 * CueGrid — 歌詞 Cue List 面板
 *
 * 中欄核心元件，顯示歌詞行列表，支援點擊跳轉、LIVE 指示、
 * 自動滾動、鍵盤快捷鍵（方向鍵/空白鍵/Home/End/數字鍵）。
 * 底部 Transport Controls 提供進度條和下一行按鈕。
 */

"use client";

import { useEffect, useRef, useMemo, type FC } from "react";
import { useLyricsStore } from "@/lib/store";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

interface CueGridProps {
  /** AI 追蹤手動覆寫回呼（當使用者手動操作時觸發） */
  onManualOverride?: () => void;
}

export const CueGrid: FC<CueGridProps> = ({ onManualOverride }) => {
  const lyrics = useLyricsStore((state) => state.lyrics);
  const currentIndex = useLyricsStore((state) => state.currentIndex);
  const jumpToLine = useLyricsStore((state) => state.jumpToLine);
  const currentSong = useLyricsStore((state) => state.currentSong);
  const displaySettings = useLyricsStore((state) => state.displaySettings);
  const nextLine = useLyricsStore((state) => state.nextLine);
  const prevLine = useLyricsStore((state) => state.prevLine);
  const togglePlaying = useLyricsStore((state) => state.togglePlaying);

  const activeLineRef = useRef<HTMLDivElement>(null);
  const totalLines = lyrics.length;
  const canGoNext = currentIndex < totalLines - 1;

  // 自動滾動到當前行
  useEffect(() => {
    if (activeLineRef.current && displaySettings.autoScroll) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentIndex, displaySettings.autoScroll]);

  // 鍵盤快捷鍵（透過 useKeyboardShortcuts hook 統一管理）
  const keyboardShortcuts = useMemo(
    () => ({
      ArrowDown: () => {
        nextLine();
        onManualOverride?.();
      },
      ArrowRight: () => {
        nextLine();
        onManualOverride?.();
      },
      ArrowUp: () => {
        prevLine();
        onManualOverride?.();
      },
      ArrowLeft: () => {
        prevLine();
        onManualOverride?.();
      },
      " ": () => togglePlaying(),
      Home: () => {
        jumpToLine(0);
        onManualOverride?.();
      },
      End: () => {
        jumpToLine(totalLines - 1);
        onManualOverride?.();
      },
      ...Object.fromEntries(
        Array.from({ length: 9 }, (_, i) => [
          String(i + 1),
          () => {
            jumpToLine(i);
            onManualOverride?.();
          },
        ]),
      ),
    }),
    [nextLine, prevLine, togglePlaying, jumpToLine, totalLines, onManualOverride],
  );

  useKeyboardShortcuts(keyboardShortcuts);

  // 空狀態：未選擇歌曲
  if (!currentSong || totalLines === 0) {
    return (
      <div className="h-full flex flex-col bg-surface relative">
        <CueGridHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="mx-auto text-border-dim"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <p className="font-mono text-[13px] text-text-muted tracking-wider uppercase">
              No Track Selected
            </p>
            <p className="font-mono text-[11px] text-border-dim">
              Select a track from the library to begin
            </p>
          </div>
        </div>
        <div className="p-3 border-t border-border-dim shrink-0">
          <div className="w-full h-10 bg-elevated border border-border-dim flex items-center justify-center text-border-dim font-mono text-[13px] tracking-widest">
            [ SPACE ] — GO TO NEXT CUE
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface relative">
      {/* Cue Grid Header */}
      <CueGridHeader />

      {/* Cue Grid Body */}
      <div className="flex-1 overflow-y-auto pb-20 min-h-0">
        {lyrics.map((line, idx) => {
          const isActive = idx === currentIndex;
          const isPast = idx < currentIndex;
          const isNext = idx === currentIndex + 1;

          if (isActive) {
            return (
              <div
                key={idx}
                ref={activeLineRef}
                onClick={() => {
                  jumpToLine(idx);
                  onManualOverride?.();
                }}
                className="flex items-center px-4 py-3.5 bg-elevated border-y border-primary/30 relative cursor-pointer"
                style={{
                  boxShadow:
                    "inset 4px 0 0 0 hsl(var(--color-primary))",
                }}
              >
                <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                <div className="w-14 font-mono text-[13px] text-primary flex items-center gap-1.5 relative z-10">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div
                  className="flex-1 pl-3 text-[16px] font-bold tracking-wide relative z-10"
                  style={{
                    color: displaySettings.highlightColor,
                    fontFamily: "'Noto Sans TC', 'Exo 2', sans-serif",
                  }}
                >
                  {line || "(空行)"}
                </div>
                <div className="w-14 text-right relative z-10">
                  <span className="text-[9px] font-mono border border-primary text-primary px-1.5 py-0.5 bg-primary/10">
                    LIVE
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={idx}
              onClick={() => {
                jumpToLine(idx);
                onManualOverride?.();
              }}
              className={`group flex items-center px-4 py-2.5 border-b border-border-dim/30 cursor-crosshair transition-colors ${
                isNext
                  ? "bg-elevated/30 hover:bg-elevated/80"
                  : "hover:bg-elevated/50"
              }`}
            >
              <div
                className={`w-14 font-mono text-[13px] ${isPast ? "text-text-muted" : isNext ? "text-text-primary" : "text-text-muted"}`}
              >
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div
                className={`flex-1 pl-3 text-[14px] ${isPast ? "text-text-muted" : isNext ? "text-text-primary" : "text-text-muted"}`}
                style={{
                  fontFamily: "'Noto Sans TC', 'Exo 2', sans-serif",
                }}
              >
                {line || "(空行)"}
              </div>
              <div className="w-14 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-mono border border-border-dim text-text-muted px-1.5 py-0.5 bg-surface">
                  JUMP
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transport Controls (Fixed Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-surface border-t border-border-dim">
        <div className="flex items-center gap-3 mb-2 px-1">
          <span className="font-mono text-[11px] text-primary font-semibold">
            {String(currentIndex + 1).padStart(2, "0")}
          </span>
          <div className="flex-1 h-[2px] bg-border-dim relative">
            <div
              className="absolute inset-y-0 left-0 bg-primary transition-all duration-200"
              style={{
                width: `${((currentIndex + 1) / totalLines) * 100}%`,
              }}
            />
          </div>
          <span className="font-mono text-[11px] text-text-muted">
            {String(totalLines).padStart(2, "0")}
          </span>
        </div>
        <button
          onClick={() => {
            if (canGoNext) {
              nextLine();
              onManualOverride?.();
            }
          }}
          disabled={!canGoNext}
          className="w-full h-10 bg-elevated border border-primary text-primary font-mono text-[13px] tracking-widest flex items-center justify-center gap-2 hover:bg-primary hover:text-surface transition-colors active:scale-[0.99] disabled:opacity-30 disabled:hover:bg-elevated disabled:hover:text-primary disabled:cursor-not-allowed"
          type="button"
        >
          [ SPACE ] — GO TO NEXT CUE
        </button>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// 內部子元件：Cue Grid 標頭列
// ────────────────────────────────────────────────────────────

const CueGridHeader: FC = () => (
  <div className="flex items-center px-4 py-3 border-b border-border-dim bg-elevated shrink-0">
    <div className="w-14 font-mono text-[11px] text-text-muted uppercase">
      Line
    </div>
    <div className="flex-1 font-mono text-[11px] text-text-muted uppercase pl-3">
      Lyric Payload
    </div>
    <div className="w-14 font-mono text-[11px] text-text-muted uppercase text-right">
      Action
    </div>
  </div>
);
