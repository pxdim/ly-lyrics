/**
 * LyricsControl Component
 *
 * Navigation controls for lyrics display with prev/next buttons and line selector.
 * Design System v2.0 - Dark Tech Edition
 */

"use client";

import { type FC } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useLyricsStore, selectNavigationState } from "@/lib/store";

export interface LyricsControlProps {
  /** Optional custom class name for styling */
  className?: string;
  /** Show compact version (buttons only) */
  compact?: boolean;
  /** Position of the controls */
  position?: "top" | "bottom" | "floating";
}

export const LyricsControl: FC<LyricsControlProps> = ({
  className = "",
  compact = false,
  position = "bottom",
}) => {
  const { currentIndex, totalLines, canGoNext, canGoPrev } = useLyricsStore(selectNavigationState);
  const { nextLine, prevLine, jumpToLine } = useLyricsStore();

  const handlePrev = () => {
    if (canGoPrev) {
      prevLine();
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      nextLine();
    }
  };

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
    gap: "1rem",
    padding: "1rem 1.5rem",
    backgroundColor: "rgba(3, 3, 4, 0.9)",
    backdropFilter: "blur(12px)",
    borderRadius: "9999px",
    boxShadow: "0 0 10px rgba(0, 217, 255, 0.2)",
    border: "1px solid " + "rgba(0, 217, 255, 0.3)",
    transition: "all 200ms ease-out",
    ...positionStyles[position],
  };

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2.75rem",
    height: "2.75rem",
    borderRadius: "9999px",
    border: "1px solid " + "rgba(0, 217, 255, 0.3)",
    backgroundColor: "rgba(0, 217, 255, 0.1)",
    color: "#00D9FF",
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
    padding: "0.625rem 2.5rem 0.625rem 1rem",
    borderRadius: "0.5rem",
    border: "1px solid " + "rgba(0, 217, 255, 0.3)",
    backgroundColor: "rgba(3, 3, 4, 0.8)",
    color: "#FFFFFF",
    fontSize: "0.875rem",
    fontFamily: "'Exo 2', sans-serif",
    cursor: "pointer",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2300D9FF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.625rem center",
    backgroundSize: "1rem",
    minWidth: "140px",
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
            e.currentTarget.style.backgroundColor = "rgba(0, 217, 255, 0.2)";
            e.currentTarget.style.boxShadow = "0 0 10px rgba(0, 217, 255, 0.4)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(0, 217, 255, 0.1)";
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
            e.currentTarget.style.backgroundColor = "rgba(0, 217, 255, 0.2)";
            e.currentTarget.style.boxShadow = "0 0 10px rgba(0, 217, 255, 0.4)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(0, 217, 255, 0.1)";
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
    </div>
  );
};
