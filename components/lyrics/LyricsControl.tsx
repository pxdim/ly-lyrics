/**
 * LyricsControl Component
 *
 * Navigation controls for lyrics display with prev/next buttons and line selector.
 * Design System v2.0 - Dark Tech Edition
 */

"use client";

import { type FC, useState, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { useLyricsStore } from "@/lib/store";
import { useDebouncedCallback } from "@/lib/hooks/useDebounce";

export interface LyricsControlProps {
  /** Optional custom class name for styling */
  className?: string;
  /** Show compact version (buttons only) */
  compact?: boolean;
  /** Position of the controls */
  position?: "top" | "bottom" | "floating";
  /** Whether the display is currently in fullscreen */
  isFullscreen?: boolean;
  /** Callback to toggle fullscreen mode */
  onToggleFullscreen?: (() => void) | undefined;
}

export const LyricsControl: FC<LyricsControlProps> = ({
  className = "",
  compact = false,
  position = "bottom",
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  // 偵測手機視窗寬度，用於調整 inline style 的響應式尺寸
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const currentIndex = useLyricsStore((state) => state.currentIndex);
  const lyrics = useLyricsStore((state) => state.lyrics);
  const nextLine = useLyricsStore((state) => state.nextLine);
  const prevLine = useLyricsStore((state) => state.prevLine);
  const jumpToLine = useLyricsStore((state) => state.jumpToLine);

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

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    top: {
      position: "sticky" as const,
      top: 0,
      zIndex: 50,
    },
    bottom: {
      position: "sticky" as const,
      bottom: 0,
      zIndex: 50,
    },
    floating: {
      position: "fixed" as const,
      bottom: "2rem",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 50,
    },
  };

  const baseStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: isMobile ? "0.5rem" : "1rem",
    padding: isMobile ? "0.625rem 1rem" : "1rem 1.5rem",
    backgroundColor: "rgba(3, 3, 4, 0.9)",
    backdropFilter: "blur(12px)",
    borderRadius: "9999px",
    boxShadow: "0 0 10px hsl(var(--color-glow-primary) / 0.2)",
    border: "1px solid " + "hsl(var(--color-glow-primary) / 0.3)",
    transition: "all 200ms ease-out",
    ...positionStyles[position],
  };

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: isMobile ? "2.25rem" : "2.75rem",
    height: isMobile ? "2.25rem" : "2.75rem",
    borderRadius: "9999px",
    border: "1px solid " + "hsl(var(--color-glow-primary) / 0.3)",
    backgroundColor: "hsl(var(--color-glow-primary) / 0.1)",
    color: "hsl(var(--color-primary))",
    cursor: "pointer",
    transition: "all 200ms ease-out",
  };

  const buttonDisabledStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: 0.3,
    cursor: "not-allowed",
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "rgba(255, 255, 255, 0.3)",
  };

  const selectStyle: React.CSSProperties = {
    padding: isMobile ? "0.5rem 2rem 0.5rem 0.75rem" : "0.625rem 2.5rem 0.625rem 1rem",
    borderRadius: "0.5rem",
    border: "1px solid " + "hsl(var(--color-glow-primary) / 0.3)",
    backgroundColor: "rgba(3, 3, 4, 0.8)",
    color: "hsl(var(--color-text-primary))",
    fontSize: isMobile ? "0.75rem" : "0.875rem",
    fontFamily: "'Exo 2', sans-serif",
    cursor: "pointer",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23FF6B00'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.625rem center",
    backgroundSize: "1rem",
    minWidth: isMobile ? "100px" : "140px",
    transition: "all 200ms ease-out",
  };

  // Empty state
  if (totalLines === 0) {
    return null;
  }

  return (
    <div style={baseStyle} className={`lyrics-control ${className}`}>
      {/* Previous Button */}
      <button
        style={canGoPrev ? buttonStyle : buttonDisabledStyle}
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label="Previous line"
        title="Previous line (Arrow Up)"
        type="button"
        onMouseEnter={(e) => {
          if (canGoPrev) {
            e.currentTarget.style.backgroundColor = "hsl(var(--color-glow-primary) / 0.2)";
            e.currentTarget.style.boxShadow = "0 0 10px hsl(var(--color-glow-primary) / 0.4)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "hsl(var(--color-glow-primary) / 0.1)";
          e.currentTarget.style.boxShadow = "none";
        }}
        className="group"
      >
        <ChevronUp
          size={20}
          strokeWidth={2.5}
          className="transition-transform duration-200 group-hover:-translate-y-0.5"
        />
      </button>

      {/* Line Selector - hidden in compact mode */}
      {!compact && (
        <div style={{ position: "relative" }}>
          <select
            style={selectStyle}
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

      {/* Current Position (compact mode) */}
      {compact && (
        <span
          className="font-mono text-primary"
          style={{
            fontSize: "0.875rem",
            fontWeight: "500",
            minWidth: "60px",
            textAlign: "center",
          }}
        >
          {currentIndex + 1}/{totalLines}
        </span>
      )}

      {/* Next Button */}
      <button
        style={canGoNext ? buttonStyle : buttonDisabledStyle}
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Next line"
        title="Next line (Arrow Down)"
        type="button"
        onMouseEnter={(e) => {
          if (canGoNext) {
            e.currentTarget.style.backgroundColor = "hsl(var(--color-glow-primary) / 0.2)";
            e.currentTarget.style.boxShadow = "0 0 10px hsl(var(--color-glow-primary) / 0.4)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "hsl(var(--color-glow-primary) / 0.1)";
          e.currentTarget.style.boxShadow = "none";
        }}
        className="group"
      >
        <ChevronDown
          size={20}
          strokeWidth={2.5}
          className="transition-transform duration-200 group-hover:translate-y-0.5"
        />
      </button>

      {/* Fullscreen Toggle (only when callback provided) */}
      {onToggleFullscreen && (
        <>
          {/* Separator */}
          <div style={{ width: "1px", height: "1.75rem", backgroundColor: "hsl(var(--color-glow-primary) / 0.3)", margin: "0 0.25rem" }} />

          <button
            style={buttonStyle}
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "退出全螢幕 (F)" : "全螢幕 (F)"}
            type="button"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "hsl(var(--color-glow-primary) / 0.2)";
              e.currentTarget.style.boxShadow = "0 0 10px hsl(var(--color-glow-primary) / 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "hsl(var(--color-glow-primary) / 0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
            className="group"
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
