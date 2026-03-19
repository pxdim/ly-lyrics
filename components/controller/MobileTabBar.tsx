/**
 * MobileTabBar — 手機版底部分頁導航列
 *
 * 固定於畫面底部，高度 h-14，三等分（歌曲/歌詞/設定）。
 * 啟用分頁頂部顯示 cyan 指示線。
 */

"use client";

import type { FC, ReactNode } from "react";

/** 手機版分頁類型 */
export type MobileTab = "songs" | "lyrics" | "settings";

interface MobileTabBarProps {
  /** 當前啟用的分頁 */
  activeTab: MobileTab;
  /** 分頁切換回呼 */
  onTabChange: (tab: MobileTab) => void;
}

/** 分頁定義 */
const tabs: { key: MobileTab; label: string; icon: ReactNode }[] = [
  {
    key: "songs",
    label: "歌曲",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    key: "lyrics",
    label: "歌詞",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "設定",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export const MobileTabBar: FC<MobileTabBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <nav className="flex items-stretch border-t border-border-dim bg-elevated shrink-0 h-14">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors ${
              isActive
                ? "text-primary"
                : "text-text-muted active:text-text-primary"
            }`}
          >
            {tab.icon}
            <span
              className={`text-[10px] font-mono ${isActive ? "text-primary" : ""}`}
            >
              {tab.label}
            </span>
            {/* 啟用分頁的上方指示線 */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
