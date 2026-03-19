/**
 * DashboardCard -- 可拖曳卡片佈局的基礎容器元件
 *
 * 用於控制台儀表板中的每個面板（歌曲庫、Cue Grid、預覽等）。
 * 提供統一的卡片外觀、拖曳把手、最小化/最大化按鈕。
 *
 * 設計系統：使用 CSS 變數 + Tailwind 語意 class，零硬編碼 hex/rgba。
 */

"use client";

import { type ReactNode } from "react";
import { GripVertical, Minus, Maximize2 } from "lucide-react";

// ============================================================================
// 型別定義
// ============================================================================

interface DashboardCardProps {
  /** 卡片標題，顯示在 header 區域 */
  title: string;
  /** 卡片內容 */
  children: ReactNode;
  /** 最小化回呼；未提供時不渲染最小化按鈕 */
  onMinimize?: () => void;
  /** 是否鎖定拖曳（佈局鎖定時為 true） */
  isLocked?: boolean;
  /** 額外的 CSS class */
  className?: string;
}

// ============================================================================
// 元件
// ============================================================================

export function DashboardCard({
  title,
  children,
  onMinimize,
  isLocked = false,
  className = "",
}: DashboardCardProps) {
  return (
    <div
      className={`flex flex-col h-full bg-surface border border-border-dim rounded-lg overflow-hidden ${className}`}
    >
      {/* Header — 36px 高度，包含拖曳把手、標題、操作按鈕 */}
      <div className="flex items-center h-9 bg-elevated border-b border-border-dim px-2 gap-1.5 shrink-0">
        {/* 拖曳把手 */}
        <div
          className={`card-drag-handle flex items-center ${
            isLocked
              ? "cursor-not-allowed opacity-30"
              : "cursor-grab active:cursor-grabbing"
          }`}
        >
          <GripVertical className="w-3.5 h-3.5 text-text-dim" />
        </div>

        {/* 標題 */}
        <span className="text-[11px] font-mono font-semibold text-text-muted uppercase tracking-wider flex-1">
          {title}
        </span>

        {/* 操作按鈕 */}
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            title="最小化"
            className="p-1 hover:bg-surface rounded transition-colors"
          >
            <Minus className="w-3 h-3 text-text-dim" />
          </button>
        )}
        <button
          type="button"
          title="最大化（即將推出）"
          disabled
          className="p-1 rounded transition-colors opacity-30 cursor-not-allowed"
        >
          <Maximize2 className="w-3 h-3 text-text-dim" />
        </button>
      </div>

      {/* 內容區域 */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
