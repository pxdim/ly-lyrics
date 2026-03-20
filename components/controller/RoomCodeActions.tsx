/**
 * RoomCodeActions — 房間碼操作列
 *
 * 包含房間碼複製按鈕、顯示端連結複製、重新產生房間碼、QR Code 彈出按鈕。
 * 從 ControllerHeader StatusBar 左側區域抽取。
 */

"use client";

import { useState, useCallback, type FC } from "react";
import { useTranslations } from "next-intl";
import { QRCodePopover } from "@/components/controller/QRCodePopover";

// ============================================================================
// 型別定義
// ============================================================================

interface RoomCodeActionsProps {
  /** 房間碼 */
  sessionCode: string;
  /** 重新產生房間碼回呼 */
  onRegenerate: () => void;
}

// ============================================================================
// 元件
// ============================================================================

export const RoomCodeActions: FC<RoomCodeActionsProps> = ({
  sessionCode,
  onRegenerate,
}) => {
  const t = useTranslations("controller.header");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [showQR, setShowQR] = useState(false);

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

  return (
    <div className="flex items-center gap-1.5 ml-2">
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

      {/* 複製顯示端連結按鈕 */}
      <button
        type="button"
        onClick={() => copyToClipboard("link")}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border-dim rounded-md hover:border-primary/40 hover:bg-primary/5 transition-all text-[11px] font-mono text-text-muted hover:text-primary cursor-pointer"
        title={t("copyDisplayLink")}
      >
        {/* 連結圖示 */}
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

      {/* QR Code 按鈕（全斷點可見） */}
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

        {/* Popover (平板) / Modal (手機) */}
        {showQR && (
          <QRCodePopover
            sessionCode={sessionCode}
            onClose={() => setShowQR(false)}
            variant="popover"
          />
        )}
      </div>
    </div>
  );
};
