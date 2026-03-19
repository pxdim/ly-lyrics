/**
 * QuickSettings — 顯示端設定面板
 *
 * 包含顯示行數、字體大小、行距、高亮色、主題切換、開關選項等。
 * 直接讀取 Zustand store 中的 displaySettings。
 * 所有 UI 字串透過 next-intl useTranslations 取得。
 */

"use client";

import { type FC, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLyricsStore } from "@/lib/store";
import { ToggleRow } from "./ToggleRow";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { validateImageFile, fileToDataUrl } from "@/lib/utils/image-upload";

/**
 * 高亮色選項
 * 前兩項對應主題主色（primary=#FF6A00, secondary=#00E5FF）
 */
const HIGHLIGHT_COLORS = [
  { value: "#FF6A00", label: "Primary" },
  { value: "#00E5FF", label: "Secondary" },
  { value: "#00FF88", label: "Green" },
  { value: "#FF3366", label: "Pink" },
  { value: "#FFB800", label: "Gold" },
  { value: "#FF6B35", label: "Orange" },
] as const;

export const QuickSettings: FC = () => {
  const t = useTranslations("controller.settings");
  const tc = useTranslations("common");
  const displaySettings = useLyricsStore((state) => state.displaySettings);
  const updateDisplaySettings = useLyricsStore(
    (state) => state.updateDisplaySettings,
  );

  /** FR4.3：處理背景圖片上傳 */
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validation = validateImageFile(file);
      if (!validation.valid) {
        // 重設 input 讓使用者可以重新選擇同一檔案
        e.target.value = "";
        return;
      }

      const dataUrl = await fileToDataUrl(file);
      updateDisplaySettings({ backgroundImage: dataUrl });
      // 重設 input 讓使用者可以重新選擇同一檔案
      e.target.value = "";
    },
    [updateDisplaySettings],
  );

  return (
    <div className="h-full flex flex-col bg-elevated">
      {/* 標題 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-dim bg-elevated shrink-0">
        <h3 className="text-[11px] font-mono tracking-wider text-text-muted uppercase">
          {t("displayConfig")}
        </h3>
        <LocaleSwitcher />
      </div>

      {/* 設定內容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* 顯示行數 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono text-text-muted uppercase">
              {t("lines")}
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
              {t("fontSize")}
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
              {t("lineSpacing")}
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
            {t("highlight")}
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

        {/* 背景色 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono text-text-muted uppercase">
              {t("bgColor")}
            </span>
            <span
              className="inline-block w-4 h-4 border border-border-dim"
              style={{ backgroundColor: displaySettings.backgroundColor }}
            />
          </div>
          <input
            type="color"
            aria-label={t("bgColorLabel")}
            value={displaySettings.backgroundColor}
            onInput={(e) =>
              updateDisplaySettings({
                backgroundColor: (e.target as HTMLInputElement).value,
              })
            }
            className="w-full h-8 cursor-pointer bg-transparent border border-border-dim rounded appearance-none [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-sm"
          />
        </div>

        {/* 背景圖片 (FR4.3) */}
        <div>
          <span className="block text-[11px] font-mono text-text-muted uppercase mb-1.5">
            {t("bgImage")}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              id="bg-image-upload"
              onChange={handleImageUpload}
            />
            <label
              htmlFor="bg-image-upload"
              className="px-2 py-1 text-[11px] font-mono border border-border-dim bg-surface text-text-muted cursor-pointer hover:bg-elevated hover:text-text-primary transition-colors"
            >
              {tc("upload")}
            </label>
            {displaySettings.backgroundImage && (
              <>
                {/* 縮圖預覽 — data URL 不需 Next.js Image 最佳化 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displaySettings.backgroundImage}
                  alt={t("bgImageAlt")}
                  className="w-8 h-8 object-cover border border-border-dim"
                />
                <button
                  onClick={() =>
                    updateDisplaySettings({ backgroundImage: "" })
                  }
                  className="px-2 py-1 text-[11px] font-mono border border-error/30 text-error hover:bg-error/10 transition-colors"
                  type="button"
                >
                  {tc("clear")}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 主題 */}
        <div>
          <span className="block text-[11px] font-mono text-text-muted uppercase mb-1.5">
            {t("theme")}
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
                {theme === "dark" ? t("dark") : t("light")}
              </button>
            ))}
          </div>
        </div>

        {/* 開關選項 */}
        <div className="space-y-0.5">
          <ToggleRow
            label={t("background")}
            checked={displaySettings.showBackground}
            onChange={(v) => updateDisplaySettings({ showBackground: v })}
          />
          <ToggleRow
            label={t("autoScroll")}
            checked={displaySettings.autoScroll}
            onChange={(v) => updateDisplaySettings({ autoScroll: v })}
          />
          <ToggleRow
            label={t("animation")}
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
          {t("restartWs")}
        </button>
        <button
          onClick={() => useLyricsStore.getState().setCurrentSong(null)}
          className="bg-surface border border-border-dim p-2 text-[10px] font-mono text-text-muted hover:text-text-primary hover:bg-elevated/50 text-center transition-colors"
          type="button"
        >
          {t("blackout")}
        </button>
      </div>
    </div>
  );
};
