/**
 * LayoutControls — 佈局模板選擇器 + 鎖定按鈕
 *
 * 從 EnhancedHeader 提取的獨立元件，作為 StatusBar 的 rightSlot 使用。
 * 包含：
 * 1. 佈局模板切換下拉選單（Standard / Focus / Full / Minimal）
 * 2. 佈局鎖定/解鎖按鈕
 *
 * 設計系統：使用 CSS 變數 + Tailwind 語意 class，零硬編碼 hex/rgba。
 */

"use client";

import { useState, useCallback, type FC } from "react";
import { Lock, Unlock } from "lucide-react";
import { useLayoutStore } from "@/lib/store/layout-store";

// ============================================================================
// 佈局模板選項
// ============================================================================

const PRESETS = [
  { id: "standard", label: "STANDARD" },
  { id: "focus", label: "FOCUS" },
  { id: "full", label: "FULL" },
  { id: "minimal", label: "MINIMAL" },
] as const;

// ============================================================================
// 元件
// ============================================================================

export const LayoutControls: FC = () => {
  const currentPreset = useLayoutStore((state) => state.currentPreset);
  const isLocked = useLayoutStore((state) => state.isLocked);
  const toggleLock = useLayoutStore((state) => state.toggleLock);
  const applyPreset = useLayoutStore((state) => state.applyPreset);

  const [showPresets, setShowPresets] = useState(false);

  // 套用佈局模板
  const handleApplyPreset = useCallback(
    (presetId: string) => {
      applyPreset(presetId);
      setShowPresets(false);
    },
    [applyPreset],
  );

  return (
    <>
      {/* 佈局模板選擇器 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border-dim rounded-md hover:border-secondary/40 hover:bg-secondary/5 transition-all text-[11px] font-mono text-text-muted hover:text-secondary cursor-pointer"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          {currentPreset.toUpperCase()}
        </button>

        {/* 預設選項下拉 */}
        {showPresets && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPresets(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-50 bg-elevated border border-border-dim rounded-lg shadow-xl py-1 min-w-[120px]">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors cursor-pointer ${
                    currentPreset === preset.id
                      ? "text-secondary bg-secondary/10"
                      : "text-text-muted hover:text-text-primary hover:bg-surface"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 鎖定按鈕 */}
      <button
        type="button"
        onClick={toggleLock}
        title={isLocked ? "解鎖佈局" : "鎖定佈局"}
        className={`p-1.5 rounded-md border transition-all cursor-pointer ${
          isLocked
            ? "bg-warning/10 border-warning/30 text-warning"
            : "bg-surface border-border-dim text-text-muted hover:border-primary/40 hover:text-primary"
        }`}
      >
        {isLocked ? (
          <Lock className="w-3.5 h-3.5" />
        ) : (
          <Unlock className="w-3.5 h-3.5" />
        )}
      </button>

      {/* 分隔線 */}
      <div className="h-5 w-px bg-border-dim" />
    </>
  );
};
