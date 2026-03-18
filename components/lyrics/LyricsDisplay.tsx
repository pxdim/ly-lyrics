/**
 * LyricsDisplay Component
 *
 * Displays lyrics with Dark Tech neon glow effect and smooth scrolling.
 * Design System v2.0 - Dark Tech Edition
 */

"use client";

import { type FC, useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useLyricsStore } from "@/lib/store";
import { LyricsLine } from "./LyricsLine";

export interface LyricsDisplayProps {
  /** Optional override for lyrics - if not provided, uses store */
  lyrics?: string[];
  /** Optional override for current index - if not provided, uses store */
  currentIndex?: number;
  /** Optional override for display lines - if not provided, uses store */
  displayLines?: number;
}

export const LyricsDisplay: FC<LyricsDisplayProps> = (props) => {
  const storeLyrics = useLyricsStore((state) => state.lyrics);
  const storeIndex = useLyricsStore((state) => state.currentIndex);
  const displaySettings = useLyricsStore((state) => state.displaySettings);

  // Use props if provided, otherwise use store values
  const lyrics = props.lyrics ?? storeLyrics;
  const currentIndex = props.currentIndex ?? storeIndex;
  const displayLines = props.displayLines ?? displaySettings.displayLines;

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 偵測手機螢幕寬度，用於響應式 padding 調整
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

  // Calculate visible lyrics range
  const { visibleLyrics, startIndex, highlightIndex } = useMemo(() => {
    if (lyrics.length === 0) {
      return { visibleLyrics: [], startIndex: 0, highlightIndex: -1 };
    }

    // 前瞻偏移：少行數時當前句置頂，多行數時保留少量上文
    // prevLines = floor(displayLines / 3)：2行→0, 3行→1, 4行→1, 6行→2
    const prevLines = Math.floor(displayLines / 3);
    let startIdx = Math.max(0, currentIndex - prevLines);
    const endIdx = Math.min(lyrics.length, startIdx + displayLines);

    // Adjust start if we're near the end
    if (endIdx - startIdx < displayLines) {
      startIdx = Math.max(0, endIdx - displayLines);
    }

    const visible = lyrics.slice(startIdx, endIdx);
    return {
      visibleLyrics: visible,
      startIndex: startIdx,
      highlightIndex: currentIndex - startIdx,
    };
  }, [lyrics, currentIndex, displayLines]);

  // Auto-scroll to keep active line centered
  useEffect(() => {
    if (!displaySettings.autoScroll || !scrollRef.current) return;

    const activeElement = scrollRef.current.children[highlightIndex] as HTMLElement;
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: displaySettings.enableAnimation ? "smooth" : "auto",
        block: "center",
      });
    }
  }, [highlightIndex, displaySettings.autoScroll, displaySettings.enableAnimation]);

  // 判斷是否有背景圖片需要套用
  const hasBackgroundImage =
    displaySettings.showBackground && !!displaySettings.backgroundImage;

  // Build container style based on settings
  const containerStyle: React.CSSProperties = {
    backgroundColor: displaySettings.showBackground
      ? displaySettings.backgroundColor
      : "transparent",
    // FR4.3：背景圖片（showBackground 開啟且有 data URL 時套用）
    ...(hasBackgroundImage && {
      backgroundImage: `url(${displaySettings.backgroundImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }),
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: isMobile ? "1rem" : "2rem",
    transition: displaySettings.enableAnimation
      ? `background-color ${displaySettings.scrollDuration}ms ease`
      : "none",
  };

  const lyricsContainerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: `${displaySettings.fontSize * (displaySettings.lineSpacing ?? 0.5)}px`,
    overflowY: "auto",
    maxHeight: "80vh",
    padding: isMobile ? "1rem 0" : "2rem 0",
    scrollBehavior: displaySettings.enableAnimation ? "smooth" : "auto",
  };

  // Empty state
  if (lyrics.length === 0) {
    return (
      <div
        style={containerStyle}
        className="lyrics-display min-h-screen flex flex-col items-center justify-center p-8"
      >
        <div
          className="text-center"
          style={{
            color: displaySettings.textColor,
            fontSize: `${displaySettings.fontSize}px`,
            opacity: 0.5,
          }}
        >
          <p className="font-heading text-xl tracking-wider">NO LYRICS LOADED</p>
          <p
            className="font-body"
            style={{ fontSize: `${displaySettings.fontSize * 0.6}px` }}
          >
            Select a song to begin
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={containerStyle} className="lyrics-display">
      <div
        ref={scrollRef}
        style={lyricsContainerStyle}
        className="lyrics-container"
      >
        {visibleLyrics.map((line, idx) => (
          <LyricsLine
            key={`${startIndex + idx}-${line.slice(0, 20)}`}
            text={line}
            isActive={idx === highlightIndex}
            fontSize={displaySettings.fontSize}
            textColor={displaySettings.textColor}
            highlightColor={displaySettings.highlightColor}
            enableAnimation={displaySettings.enableAnimation}
            index={startIndex + idx}
          />
        ))}
      </div>
    </div>
  );
};
