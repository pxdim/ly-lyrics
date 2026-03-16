/**
 * QuickSettings — 顯示端設定面板
 *
 * 包含顯示行數、字體大小、行距、高亮色、主題切換、開關選項等。
 * 直接讀取 Zustand store 中的 displaySettings。
 */

"use client";

import type { FC } from "react";
import { useLyricsStore } from "@/lib/store";
import { ToggleRow } from "./ToggleRow";

/** 高亮色選項 */
const HIGHLIGHT_COLORS = [
  { value: "#00D9FF", label: "Cyan" },
  { value: "#A855F7", label: "Purple" },
  { value: "#00FF88", label: "Green" },
  { value: "#FF3366", label: "Pink" },
  { value: "#FFB800", label: "Gold" },
  { value: "#FF6B00", label: "Orange" },
] as const;

export const QuickSettings: FC = () => {
  const displaySettings = useLyricsStore((state) => state.displaySettings);
  const updateDisplaySettings = useLyricsStore(
    (state) => state.updateDisplaySettings,
  );

  return (
    <div className="h-full flex flex-col bg-elevated">
      {/* 標題 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-dim bg-elevated shrink-0">
        <h3 className="text-[11px] font-mono tracking-wider text-text-muted uppercase">
          Display Config
        </h3>
      </div>

      {/* 設定內容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* 顯示行數 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono text-text-muted uppercase">
              Lines
            </span>
            <span className="text-[11px] font-mono text-primary">
              {displaySettings.displayLines}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={displaySettings.displayLines}
            onChange={(e) =>
              updateDisplaySettings({
                displayLines: parseInt(e.target.value, 10),
              })
            }
            className="w-full h-[2px] bg-border-dim accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-none"
          />
        </div>

        {/* 字體大小 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono text-text-muted uppercase">
              Font Size
            </span>
            <span className="text-[11px] font-mono text-primary">
              {displaySettings.fontSize}px
            </span>
          </div>
          <input
            type="range"
            min={16}
            max={64}
            step={2}
            value={displaySettings.fontSize}
            onChange={(e) =>
              updateDisplaySettings({
                fontSize: parseInt(e.target.value, 10),
              })
            }
            className="w-full h-[2px] bg-border-dim accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-none"
          />
        </div>

        {/* 行距 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono text-text-muted uppercase">
              Line Spacing
            </span>
            <span className="text-[11px] font-mono text-primary">
              {(displaySettings.lineSpacing ?? 0.5).toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={displaySettings.lineSpacing ?? 0.5}
            onChange={(e) =>
              updateDisplaySettings({
                lineSpacing: parseFloat(e.target.value),
              })
            }
            className="w-full h-[2px] bg-border-dim accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-none"
          />
        </div>

        {/* 高亮色 */}
        <div>
          <span className="block text-[11px] font-mono text-text-muted uppercase mb-1.5">
            Highlight
          </span>
          <div className="grid grid-cols-6 gap-1.5">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() =>
                  updateDisplaySettings({ highlightColor: color.value })
                }
                className={`w-full aspect-square border transition-all ${
                  displaySettings.highlightColor === color.value
                    ? "border-text-primary scale-110"
                    : "border-border-dim opacity-70 hover:opacity-100 hover:border-text-muted"
                }`}
                style={{ backgroundColor: color.value }}
                type="button"
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* 主題 */}
        <div>
          <span className="block text-[11px] font-mono text-text-muted uppercase mb-1.5">
            Theme
          </span>
          <div className="flex gap-1.5">
            {(["dark", "light"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => updateDisplaySettings({ theme })}
                className={`flex-1 py-1.5 text-[11px] font-mono transition-colors border ${
                  displaySettings.theme === theme
                    ? "bg-primary/10 text-primary border-primary/40"
                    : "bg-surface text-text-muted border-border-dim hover:border-text-muted"
                }`}
                type="button"
              >
                {theme === "dark" ? "DARK" : "LIGHT"}
              </button>
            ))}
          </div>
        </div>

        {/* 開關選項 */}
        <div className="space-y-0.5">
          <ToggleRow
            label="BACKGROUND"
            checked={displaySettings.showBackground}
            onChange={(v) => updateDisplaySettings({ showBackground: v })}
          />
          <ToggleRow
            label="AUTO SCROLL"
            checked={displaySettings.autoScroll}
            onChange={(v) => updateDisplaySettings({ autoScroll: v })}
          />
          <ToggleRow
            label="ANIMATION"
            checked={displaySettings.enableAnimation}
            onChange={(v) => updateDisplaySettings({ enableAnimation: v })}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-border-dim grid grid-cols-2 gap-1.5 shrink-0">
        <button
          onClick={() => {
            useLyricsStore.getState().disconnect();
            useLyricsStore.getState().connect();
          }}
          className="bg-surface border border-border-dim p-2 text-[10px] font-mono text-text-muted hover:text-text-primary hover:bg-elevated/50 text-center transition-colors"
          type="button"
        >
          RESTART WS
        </button>
        <button
          onClick={() => useLyricsStore.getState().setCurrentSong(null)}
          className="bg-surface border border-border-dim p-2 text-[10px] font-mono text-text-muted hover:text-text-primary hover:bg-elevated/50 text-center transition-colors"
          type="button"
        >
          BLACKOUT
        </button>
      </div>
    </div>
  );
};
