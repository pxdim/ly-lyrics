/**
 * EnhancedHeader -- 控制台增強頂部狀態列
 *
 * 基於 ControllerHeader 的 StatusBar 增強版本，新增：
 * 1. 佈局模板切換按鈕組（Standard / Focus / Full / Minimal）
 * 2. 佈局鎖定/解鎖按鈕
 * 3. 當前歌曲名稱 + 歌手
 *
 * 保留原有功能：
 * - 房間碼顯示與複製
 * - 複製顯示端連結
 * - 重新產生房間碼
 * - QR Code popover
 * - 連線狀態指示
 * - 裝置計數
 *
 * 設計系統：使用 CSS 變數 + Tailwind 語意 class，零硬編碼 hex/rgba。
 */

"use client";

import { useState, useCallback, type FC } from "react";
import { useTranslations } from "next-intl";
import { Lock, Unlock } from "lucide-react";
import { useLyricsStore } from "@/lib/store";
import { useLayoutStore } from "@/lib/store/layout-store";
import { QRCodePanel } from "@/components/controller/QRCodePanel";

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
// Props 型別
// ============================================================================

interface EnhancedHeaderProps {
  /** 房間碼 */
  sessionCode: string;
  /** 重新產生房間碼回呼 */
  onRegenerate: () => void;
}

// ============================================================================
// 元件
// ============================================================================

export const EnhancedHeader: FC<EnhancedHeaderProps> = ({
  sessionCode,
  onRegenerate,
}) => {
  const t = useTranslations("controller.header");
  const tc = useTranslations("common");

  // Store 狀態
  const isConnected = useLyricsStore(
    (state) => state.connectionState === "connected",
  );
  const controllerCount = useLyricsStore((state) => state.controllerCount);
  const displayCount = useLyricsStore((state) => state.displayCount);
  const currentSong = useLyricsStore((state) => state.currentSong);

  // Layout store 狀態
  const currentPreset = useLayoutStore((state) => state.currentPreset);
  const isLocked = useLayoutStore((state) => state.isLocked);
  const toggleLock = useLayoutStore((state) => state.toggleLock);
  const applyPreset = useLayoutStore((state) => state.applyPreset);

  // 本地 UI 狀態
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // 複製到剪貼簿
  const copyToClipboard = useCallback(
    async (type: "code" | "link") => {
      const text =
        type === "code"
          ? sessionCode
          : `${window.location.origin}/display?code=${sessionCode}`;
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    },
    [sessionCode],
  );

  // 套用佈局模板
  const handleApplyPreset = useCallback(
    (presetId: string) => {
      applyPreset(presetId);
      setShowPresets(false);
    },
    [applyPreset],
  );

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-border-dim bg-elevated px-4 py-2 shrink-0 h-12">
      {/* ====== 左側：標題 + 房間碼 + 歌曲資訊 ====== */}
      <div className="flex items-center gap-3">
        {/* 品牌圖示 */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>

        {/* 房間碼：點擊複製 */}
        <button
          type="button"
          onClick={() => copyToClipboard("code")}
          className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-md hover:bg-primary/20 hover:border-primary/50 transition-all group cursor-pointer"
          title={t("copyCode")}
        >
          <span className="text-[11px] font-mono text-primary/70 uppercase tracking-wider">
            {t("room")}
          </span>
          <span className="text-[15px] font-mono font-bold text-primary tracking-[0.2em]">
            {sessionCode}
          </span>
          {/* 複製圖示 */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary/50 group-hover:text-primary transition-colors"
          >
            {copied === "code" ? (
              <path d="M20 6L9 17l-5-5" />
            ) : (
              <>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </>
            )}
          </svg>
        </button>

        {/* 複製顯示端連結 */}
        <button
          type="button"
          onClick={() => copyToClipboard("link")}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border-dim rounded-md hover:border-primary/40 hover:bg-primary/5 transition-all text-[11px] font-mono text-text-muted hover:text-primary cursor-pointer"
          title={t("copyDisplayLink")}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {copied === "link" ? (
              <path d="M20 6L9 17l-5-5" />
            ) : (
              <>
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </>
            )}
          </svg>
          {copied === "link" ? t("copiedLink") : t("copyLink")}
        </button>

        {/* 重新產生房間碼 */}
        <button
          type="button"
          onClick={onRegenerate}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border-dim rounded-md hover:border-warning/40 hover:bg-warning/5 transition-all text-[11px] font-mono text-text-muted hover:text-warning cursor-pointer"
          title={t("regenerateTooltip")}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0115.36-6.36L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 01-15.36 6.36L3 16" />
          </svg>
          {t("newRoom")}
        </button>

        {/* QR Code 按鈕 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowQR(!showQR)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border-dim rounded-md hover:border-primary/40 hover:bg-primary/5 transition-all text-[11px] font-mono text-text-muted hover:text-primary cursor-pointer"
            title={t("showQRCode")}
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
              <rect x="14" y="14" width="3" height="3" />
              <path d="M21 14h-3v3" />
              <path d="M21 21h-3v-3" />
            </svg>
            QR
          </button>

          {/* QR Code Popover */}
          {showQR && (
            <>
              {/* 背景遮罩 */}
              <div
                className="fixed inset-0 z-40 bg-void/50 md:bg-transparent"
                onClick={() => setShowQR(false)}
              />

              {/* 手機：居中 Modal */}
              <div className="fixed inset-0 z-50 flex items-center justify-center md:hidden">
                <div className="bg-elevated border border-border-dim rounded-2xl shadow-xl">
                  <QRCodePanel sessionCode={sessionCode} size={200} />
                  <div className="px-4 pb-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowQR(false)}
                      className="px-4 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    >
                      {tc("close")}
                    </button>
                  </div>
                </div>
              </div>

              {/* 平板/桌面：Popover 下拉 */}
              <div className="hidden md:block absolute right-0 top-full mt-2 z-50 bg-elevated border border-border-dim rounded-xl shadow-xl">
                <QRCodePanel sessionCode={sessionCode} size={140} />
              </div>
            </>
          )}
        </div>

        {/* 分隔線 */}
        <div className="h-5 w-px bg-border-dim" />

        {/* 當前歌曲 */}
        {currentSong && (
          <span className="text-[12px] font-mono border border-border-dim px-2 py-0.5 bg-surface text-text-muted truncate max-w-[200px]">
            {currentSong.title}
            {currentSong.artist ? ` — ${currentSong.artist}` : ""}
          </span>
        )}
      </div>

      {/* ====== 右側：佈局控制 + 連線狀態 ====== */}
      <div className="flex items-center gap-4">
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

        {/* 連線狀態 */}
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

        {/* 分隔線 */}
        <div className="h-5 w-px bg-border-dim" />

        {/* 裝置計數 */}
        <div className="flex items-center gap-4 text-[12px] font-mono text-text-muted">
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
    </header>
  );
};
