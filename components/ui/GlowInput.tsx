/**
 * GlowInput 共用輸入框元件
 *
 * 提供 label、錯誤訊息、hint 提示與 glow 聚焦效果。
 * 使用 React 19 ref-as-prop 模式，不需 forwardRef。
 * 搭配設計系統 CSS 變數（--color-glow-primary 等）與 Tailwind 工具類。
 */

"use client";

import type { InputHTMLAttributes, FC, Ref } from "react";

interface GlowInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 輸入框標籤文字 */
  label: string;
  /** 錯誤訊息，顯示於輸入框下方 */
  error?: string;
  /** 提示文字，顯示於 label 右側 */
  hint?: string;
  /** React 19 ref-as-prop */
  ref?: Ref<HTMLInputElement>;
}

/** React 19 ref-as-prop 模式，不需 forwardRef */
export const GlowInput: FC<GlowInputProps> = ({
  label,
  error,
  hint,
  id,
  className = "",
  ref,
  ...props
}) => (
  <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-body text-text-muted">
      {label}
      {hint && <span className="text-text-dim ml-1">{hint}</span>}
    </label>
    <input
      ref={ref}
      id={id}
      className={`
        w-full px-4 py-3 bg-surface border rounded-xl
        text-text-primary placeholder-text-muted
        transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
        focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--color-glow-primary)/0.1)]
        ${error ? "border-error" : "border-border-dim"}
        ${className}
      `}
      {...props}
    />
    {error && <p className="text-sm text-error font-body">{error}</p>}
  </div>
);
