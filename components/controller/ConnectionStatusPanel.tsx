/**
 * ConnectionStatusPanel — 連線狀態面板
 *
 * 顯示連線狀態指示燈、WebSocket 標籤、控制端/顯示端裝置計數。
 * 從 ControllerHeader StatusBar 右側區域抽取。
 */

"use client";

import type { FC, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useLyricsStore } from "@/lib/store";

// ============================================================================
// 型別定義
// ============================================================================

interface ConnectionStatusPanelProps {
  /** 可選的左側插槽（rightSlot），插入在連線狀態區之前 */
  leftSlot?: ReactNode;
}

// ============================================================================
// 元件
// ============================================================================

export const ConnectionStatusPanel: FC<ConnectionStatusPanelProps> = ({
  leftSlot,
}) => {
  const t = useTranslations("controller.header");
  const isConnected = useLyricsStore(
    (state) => state.connectionState === "connected",
  );
  const controllerCount = useLyricsStore((state) => state.controllerCount);
  const displayCount = useLyricsStore((state) => state.displayCount);

  return (
    <div className="flex items-center gap-6">
      {leftSlot}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? "bg-primary animate-pulse" : "bg-error"}`}
        />
        <span
          className={`text-[12px] font-mono ${isConnected ? "text-primary" : "text-error"}`}
        >
          {isConnected ? t("systemReady") : t("offline")}
        </span>
      </div>
      <div className="h-5 w-px bg-border-dim" />
      <div className="flex items-center gap-4 text-[12px] font-mono text-text-muted">
        {/* WebSocket 標籤 */}
        <span className="flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          {t("ws")}
        </span>
        {/* 控制端計數 */}
        <span className="flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="0" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          {t("ctl")}: {controllerCount}
        </span>
        {/* 顯示端計數 */}
        <span className="flex items-center gap-1.5 text-primary">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {t("dsp")}: {displayCount}
        </span>
      </div>
    </div>
  );
};
