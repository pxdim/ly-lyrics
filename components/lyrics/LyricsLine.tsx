/**
 * LyricsLine Component
 *
 * A single lyric line with Dark Tech styling, neon glow effect, and animation.
 * Design System v2.0 - Dark Tech Edition
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
  return (
    <div
      className={`
        lyrics-line
        text-center
        transition-all duration-300 ease-out
        ${enableAnimation ? "" : "transition-none"}
        ${isActive ? "scale-105 font-bold" : "opacity-40"}
      `}
      style={{
        fontSize: `${fontSize}px`,
        color: isActive ? highlightColor : textColor,
        transform: isActive ? "scale(1.05)" : "scale(1)",
        textShadow: isActive
          ? `0 0 20px ${highlightColor}40, 0 0 40px ${highlightColor}30`
          : "none",
        // 超長歌詞行溢出處理：避免無空格長字串撐破容器
        overflowWrap: "break-word",
        wordBreak: "break-word",
        maxWidth: "100%",
      }}
      data-index={index}
      data-active={isActive}
    >
      {text || "\u00A0"}
    </div>
  );
};
