/**
 * LyricsControl Component
 *
 * Navigation controls for lyrics display with prev/next buttons and line selector.
 */

"use client";

import { type FC } from "react";
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    backdropFilter: "blur(8px)",
    borderRadius: "9999px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    transition: "all 0.2s ease",
    ...positionStyles[position],
  };

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2.5rem",
    height: "2.5rem",
    borderRadius: "9999px",
    border: "none",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "white",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: "1rem",
  };

  const buttonDisabledStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: 0.3,
    cursor: "not-allowed",
  };

  const selectStyle: React.CSSProperties = {
    padding: "0.5rem 2rem 0.5rem 1rem",
    borderRadius: "0.5rem",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "white",
    fontSize: "0.875rem",
    cursor: "pointer",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.5rem center",
    backgroundSize: "1rem",
    minWidth: "120px",
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
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          width={20}
          height={20}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 15l7-7 7 7"
          />
        </svg>
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
          style={{
            color: "white",
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
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          width={20}
          height={20}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </div>
  );
};
