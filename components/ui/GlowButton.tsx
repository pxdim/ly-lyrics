/**
 * GlowButton 共用按鈕元件
 *
 * 提供 primary / secondary / ghost 三種變體，支援 loading 狀態與 glow 效果。
 * 使用設計系統 CSS 變數（--color-glow-primary 等）與 Tailwind shadow-glow 工具類。
 */

"use client";

import { type ButtonHTMLAttributes, type FC, type ReactNode } from "react";
import { Spinner } from "./Spinner";

/** 各變體對應 Tailwind class */
const variantClasses = {
  primary:
    "bg-primary text-white font-heading uppercase tracking-wider " +
    "border-2 border-primary/50 " +
    "shadow-[0_0_20px_hsl(var(--color-glow-primary)/0.4)] " +
    "hover:shadow-[0_0_30px_hsl(var(--color-glow-primary)/0.6)] " +
    "hover:-translate-y-0.5 active:scale-[0.97]",
  secondary:
    "bg-transparent text-secondary font-heading uppercase tracking-wider " +
    "border-2 border-secondary/50 " +
    "shadow-[0_0_10px_hsl(var(--color-glow-secondary)/0.2)] " +
    "hover:shadow-[0_0_20px_hsl(var(--color-glow-secondary)/0.4)] " +
    "hover:-translate-y-0.5 active:scale-[0.97]",
  ghost:
    "bg-transparent text-text-primary border-2 border-white/10 " +
    "hover:border-primary/30 hover:shadow-[0_0_10px_hsl(var(--color-glow-primary)/0.15)] " +
    "active:scale-[0.97]",
} as const;

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按鈕變體：primary / secondary / ghost，預設 primary */
  variant?: keyof typeof variantClasses;
  /** 載入中狀態：顯示 Spinner 並禁用按鈕 */
  loading?: boolean;
  /** 按鈕內容 */
  children: ReactNode;
}

export const GlowButton: FC<GlowButtonProps> = ({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}) => (
  <button
    className={`
      px-6 py-3 rounded-xl font-heading font-semibold uppercase tracking-wider
      transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none
      ${variantClasses[variant]}
      ${className}
    `}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? (
      <span className="inline-flex items-center gap-2">
        <Spinner size="sm" />
        {children}
      </span>
    ) : (
      children
    )}
  </button>
);
