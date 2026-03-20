/**
 * ControllerHeader -- 控制台頂部狀態列
 *
 * 包含桌面/平板版 StatusBar 和手機版 MobileStatusBar 兩種變體。
 * 顯示房間碼、連線狀態、裝置計數、QR Code 按鈕等。
 * 所有 UI 字串透過 next-intl useTranslations 取得。
 */

"use client";

import { useState, useCallback, type FC, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useLyricsStore } from "@/lib/store";
import { RoomCodeActions } from "@/components/controller/RoomCodeActions";
import { ConnectionStatusPanel } from "@/components/controller/ConnectionStatusPanel";
import { QRCodePopover } from "@/components/controller/QRCodePopover";

// ============================================================================
// 桌面/平板版狀態列
// ============================================================================

interface StatusBarProps {
  /** 房間碼 */
  sessionCode: string;
  /** 重新產生房間碼回呼 */
  onRegenerate: () => void;
  /** 可選的右側插槽，插入在連線狀態區之前 */
  rightSlot?: ReactNode;
}

export const StatusBar: FC<StatusBarProps> = ({
  sessionCode,
  onRegenerate,
  rightSlot,
}) => {
  const t = useTranslations("controller.header");
  const currentSong = useLyricsStore((state) => state.currentSong);

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-border-dim bg-elevated px-6 py-2 shrink-0 h-12">
      {/* 左：標題 + 房間碼 */}
      <div className="flex items-center gap-4">
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
        <h2 className="text-[16px] font-semibold leading-tight tracking-[-0.015em]">
          {t("controlDesk")}
        </h2>

        {/* 房間碼操作列 */}
        <RoomCodeActions
          sessionCode={sessionCode}
          onRegenerate={onRegenerate}
        />

        {/* 目前歌曲 */}
        {currentSong && (
          <span className="text-[12px] font-mono border border-border-dim px-2 py-0.5 bg-surface text-text-muted ml-2 truncate max-w-[200px]">
            {currentSong.title}
            {currentSong.artist ? ` — ${currentSong.artist}` : ""}
          </span>
        )}
      </div>

      {/* 右：rightSlot + 連線狀態 */}
      <ConnectionStatusPanel leftSlot={rightSlot} />
    </header>
  );
};

// ============================================================================
// 手機版精簡狀態列（高度 h-11）
// ============================================================================

interface MobileStatusBarProps {
  /** 房間碼 */
  sessionCode: string;
  /** 是否已連線 */
  isConnected: boolean;
  /** 重新產生房間碼回呼 */
  onRegenerate: () => void;
}

export const MobileStatusBar: FC<MobileStatusBarProps> = ({
  sessionCode,
  isConnected,
  onRegenerate,
}) => {
  const t = useTranslations("controller.header");
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sessionCode]);

  return (
    <header className="flex items-center justify-between border-b border-border-dim bg-elevated px-4 shrink-0 h-11">
      {/* 左：標題 + 房間碼 */}
      <div className="flex items-center gap-3">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary shrink-0"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <button
          type="button"
          onClick={copyCode}
          className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/30 rounded-md active:bg-primary/20 transition-all"
          title={t("copyCode")}
        >
          <span className="text-[10px] font-mono text-primary/70 uppercase tracking-wider">
            {t("room")}
          </span>
          <span className="text-[13px] font-mono font-bold text-primary tracking-[0.15em]">
            {sessionCode}
          </span>
          {copied && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-primary"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>
      </div>

      {/* 右：QR 按鈕 + 連線狀態 */}
      <div className="flex items-center gap-3">
        {/* QR 按鈕 */}
        <button
          type="button"
          onClick={() => setShowQR(true)}
          className="flex items-center justify-center w-8 h-8 bg-surface border border-border-dim rounded-md active:bg-primary/10 active:border-primary/30 transition-all"
          title={t("showQRCode")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="3" height="3" />
            <path d="M21 14h-3v3" />
            <path d="M21 21h-3v-3" />
          </svg>
        </button>

        {/* 連線狀態指示燈 */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-primary animate-pulse" : "bg-error"}`}
          />
          <span
            className={`text-[11px] font-mono ${isConnected ? "text-primary" : "text-error"}`}
          >
            {isConnected ? t("on") : t("off")}
          </span>
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <QRCodePopover
          sessionCode={sessionCode}
          onClose={() => setShowQR(false)}
          variant="modal"
          onRegenerate={onRegenerate}
        />
      )}
    </header>
  );
};
