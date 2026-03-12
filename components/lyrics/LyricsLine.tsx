/**
 * LyricsLine Component
 *
 * A single lyric line with optional highlighting and animation.
 */

import { type FC } from "react";

export interface LyricsLineProps {
  /** The lyric text to display */
  text: string;
  /** Whether this line is currently active/highlighted */
  isActive: boolean;
  /** Font size in pixels */
  fontSize: number;
  /** Text color for inactive lines */
  textColor: string;
  /** Highlight color for active line */
  highlightColor: string;
  /** Whether animations are enabled */
  enableAnimation: boolean;
  /** Unique index for transition key */
  index: number;
}

export const LyricsLine: FC<LyricsLineProps> = ({
  text,
  isActive,
  fontSize,
  textColor,
  highlightColor,
  enableAnimation,
  index,
}) => {
  // Build style object
  const style: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    color: isActive ? highlightColor : textColor,
    opacity: isActive ? 1 : 0.5,
    fontWeight: isActive ? "600" : "400",
    textAlign: "center",
    transition: enableAnimation
      ? "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      : "none",
    transform: isActive ? "scale(1.05)" : "scale(1)",
    textShadow: isActive
      ? `0 0 20px ${highlightColor}40, 0 2px 4px rgba(0,0,0,0.3)`
      : "none",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    minHeight: `${fontSize * 1.5}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div
      className="lyrics-line"
      style={style}
      data-index={index}
      data-active={isActive}
    >
      {text || "\u00A0"}
    </div>
  );
};
