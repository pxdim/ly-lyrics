/**
 * QRCodePopover — QR Code 彈出視窗
 *
 * 支援兩種顯示模式：
 * - 手機：全螢幕置中 Modal
 * - 平板/桌面：下拉 Popover（僅在 StatusBar 使用時）
 *
 * 從 ControllerHeader 抽取的共用元件。
 */

"use client";

import type { FC } from "react";
import { useTranslations } from "next-intl";
import { QRCodePanel } from "@/components/controller/QRCodePanel";

// ============================================================================
// 型別定義
// ============================================================================

interface QRCodePopoverProps {
  /** 房間碼 */
  sessionCode: string;
  /** 關閉回呼 */
  onClose: () => void;
  /** 顯示模式：popover 含平板下拉，modal 僅全螢幕 */
  variant: "popover" | "modal";
  /** 重新產生房間碼回呼（僅 modal 模式使用） */
  onRegenerate?: () => void;
}

// ============================================================================
// 元件
// ============================================================================

export const QRCodePopover: FC<QRCodePopoverProps> = ({
  sessionCode,
  onClose,
  variant,
  onRegenerate,
}) => {
  const tc = useTranslations("common");
  const t = useTranslations("controller.header");

  if (variant === "popover") {
    return (
      <>
        {/* 背景遮罩 -- 手機為半透明，平板為透明（僅用於 click-outside） */}
        <div
          className="fixed inset-0 z-40 bg-void/50 md:bg-transparent"
          onClick={onClose}
        />

        {/* 手機：居中 Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center md:hidden">
          <div className="bg-elevated border border-border-dim rounded-2xl shadow-xl">
            <QRCodePanel sessionCode={sessionCode} size={200} />
            <div className="px-4 pb-3 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs text-text-muted hover:text-white transition-colors cursor-pointer"
              >
                {tc("close")}
              </button>
            </div>
          </div>
        </div>

        {/* 平板：Popover 下拉 */}
        <div className="hidden md:block absolute right-0 top-full mt-2 z-50 bg-elevated border border-border-dim rounded-xl shadow-xl">
          <QRCodePanel sessionCode={sessionCode} size={140} />
        </div>
      </>
    );
  }

  // variant === "modal"
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-void/50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-elevated border border-border-dim rounded-2xl shadow-xl">
          <QRCodePanel sessionCode={sessionCode} size={200} />
          {/* 新房間 + 關閉 */}
          <div className="px-4 pb-4 flex flex-col items-center gap-2">
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-dim rounded-lg text-[12px] font-mono text-text-muted active:bg-warning/5 active:border-warning/40 active:text-warning transition-all"
              >
                <svg
                  width="14"
                  height="14"
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
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-text-muted hover:text-white transition-colors cursor-pointer"
            >
              {tc("close")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
