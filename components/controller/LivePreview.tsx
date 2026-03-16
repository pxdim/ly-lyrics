/**
 * LivePreview — 即時預覽面板
 *
 * 模擬 Display 端的實際輸出，以 16:9 預覽區呈現當前歌詞行。
 * 使用共用的 calcVisibleLines 計算可見行範圍。
 */

"use client";

import { useMemo, type FC } from "react";
import { useLyricsStore } from "@/lib/store";
import { calcVisibleLines } from "@/lib/utils/visible-lines";

export const LivePreview: FC = () => {
  const lyrics = useLyricsStore((state) => state.lyrics);
  const currentIndex = useLyricsStore((state) => state.currentIndex);
  const currentSong = useLyricsStore((state) => state.currentSong);
  const displaySettings = useLyricsStore((state) => state.displaySettings);

  // 使用共用的 calcVisibleLines 計算可見行範圍
  const visibleLines = useMemo(() => {
    if (lyrics.length === 0) return [];
    const { start, end } = calcVisibleLines({
      currentIndex,
      totalLines: lyrics.length,
      visibleCount: displaySettings.displayLines,
    });
    return lyrics.slice(start, end).map((text, i) => ({
      text,
      isActive: start + i === currentIndex,
    }));
  }, [lyrics, currentIndex, displaySettings]);

  // 預覽容器的背景色
  const previewBg = displaySettings.showBackground
    ? displaySettings.backgroundColor
    : "#000000";

  return (
    <div className="h-full flex flex-col border-b border-border-dim bg-surface">
      {/* 標題 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-dim bg-elevated shrink-0">
        <h3 className="text-[11px] font-mono tracking-wider text-text-muted uppercase">
          Program Out
        </h3>
        <div className="flex items-center gap-2">
          {currentSong && (
            <span className="bg-red-600 text-white text-[9px] font-mono px-1.5 py-0.5">
              LIVE
            </span>
          )}
          <span className="text-[11px] font-mono text-primary">Preview</span>
        </div>
      </div>

      {/* 16:9 預覽區 — 精確模擬 Display 端 */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div
          className="w-full aspect-video max-h-full border border-border-dim relative overflow-hidden flex flex-col items-center justify-center"
          style={{ backgroundColor: previewBg }}
        >
          {/* Safe Area 導引線 */}
          <div className="absolute inset-[5%] border border-white/5 pointer-events-none" />

          {currentSong && visibleLines.length > 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 px-[10%] w-full">
              {visibleLines.map((item, i) => (
                <p
                  key={i}
                  className="text-center leading-tight transition-all duration-300"
                  style={{
                    fontSize: `clamp(10px, 2.5vw, ${Math.round(displaySettings.fontSize * 0.45)}px)`,
                    color: item.isActive
                      ? displaySettings.highlightColor
                      : displaySettings.textColor,
                    opacity: item.isActive ? 1 : 0.4,
                    transform: item.isActive ? "scale(1.05)" : "scale(1)",
                    fontWeight: item.isActive ? 700 : 400,
                    textShadow: item.isActive
                      ? `0 0 12px ${displaySettings.highlightColor}40, 0 0 24px ${displaySettings.highlightColor}20`
                      : "none",
                    fontFamily: "'Noto Sans TC', 'Exo 2', sans-serif",
                  }}
                >
                  {item.text || "\u00A0"}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-border-dim font-mono">NO SIGNAL</p>
          )}

          {/* 角標 */}
          <div className="absolute top-2 left-2 text-[9px] font-mono text-text-muted/50">
            {displaySettings.displayLines}L / {displaySettings.fontSize}px
          </div>
          <div className="absolute bottom-2 right-2 text-[9px] font-mono text-text-muted/50">
            CH 1
          </div>
        </div>
      </div>
    </div>
  );
};
