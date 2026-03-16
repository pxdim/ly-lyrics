/**
 * Spinner 共用載入指示器
 *
 * 提供 sm / md / lg 三種尺寸，使用 SVG 動畫旋轉。
 * 透過 role="status" 與 aria-label 確保無障礙存取。
 */

"use client";

import type { FC } from "react";

/** 尺寸對應 Tailwind class */
const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
} as const;

interface SpinnerProps {
  /** 尺寸：sm(16px) / md(20px) / lg(32px)，預設 md */
  size?: keyof typeof sizeClasses;
  /** 額外 CSS class（如 text-red-500 改變顏色） */
  className?: string;
}

export const Spinner: FC<SpinnerProps> = ({ size = "md", className = "" }) => (
  <svg
    className={`animate-spin ${sizeClasses[size]} ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    role="status"
    aria-label="Loading"
  >
    {/* 背景圓環（半透明） */}
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    {/* 旋轉弧段 */}
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);
