/**
 * ConfirmDialog 共用確認對話框元件
 *
 * 取代原生 window.confirm()，提供一致的視覺風格。
 * 支援預設與破壞性（destructive）變體，ESC 鍵關閉，背景點擊取消。
 * 使用 GlowButton 作為操作按鈕。
 */

"use client";

import { type FC, useEffect, useCallback } from "react";
import { GlowButton } from "./GlowButton";
import { useTranslations } from "next-intl";

interface ConfirmDialogProps {
  /** 是否顯示對話框 */
  open: boolean;
  /** 對話框標題 */
  title: string;
  /** 對話框訊息內容 */
  message: string;
  /** 確認按鈕文字，預設「確認」 */
  confirmText?: string;
  /** 取消按鈕文字，預設「取消」 */
  cancelText?: string;
  /** 變體：default 一般操作 / destructive 破壞性操作（紅色警告） */
  variant?: "default" | "destructive";
  /** 點擊確認按鈕的回呼 */
  onConfirm: () => void;
  /** 點擊取消按鈕或背景的回呼 */
  onCancel: () => void;
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText,
  cancelText,
  variant = "default",
  onConfirm,
  onCancel,
}) => {
  const tc = useTranslations("common");
  const resolvedConfirmText = confirmText ?? tc("confirm");
  const resolvedCancelText = cancelText ?? tc("cancel");
  // ESC 鍵關閉對話框
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* 背景遮罩 */}
      <div
        data-testid="confirm-backdrop"
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* 對話框主體 */}
      <div className="relative glass-elevated p-6 max-w-sm w-full mx-4 animate-scale-in">
        <h3
          id="confirm-dialog-title"
          className="font-heading font-semibold text-lg text-text-primary mb-2"
        >
          {title}
        </h3>
        <p className="font-body text-sm text-text-muted mb-6">{message}</p>

        <div className="flex justify-end gap-3">
          <GlowButton variant="ghost" onClick={onCancel}>
            {resolvedCancelText}
          </GlowButton>
          <GlowButton
            variant={variant === "destructive" ? "ghost" : "primary"}
            className={
              variant === "destructive"
                ? "border-error text-error hover:bg-error/10"
                : ""
            }
            onClick={onConfirm}
          >
            {resolvedConfirmText}
          </GlowButton>
        </div>
      </div>
    </div>
  );
};
