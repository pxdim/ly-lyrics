/**
 * ToggleRow — 純展示開關列元件
 *
 * 從 Controller page.tsx 提取的共用開關元件。
 * 支援 role="switch" 無障礙屬性、鍵盤操作（Enter / Space）。
 */

"use client";

import type { FC } from "react";

interface ToggleRowProps {
  /** 顯示標籤 */
  label: string;
  /** 開關狀態 */
  checked: boolean;
  /** 狀態變更回呼 */
  onChange: (value: boolean) => void;
}

export const ToggleRow: FC<ToggleRowProps> = ({ label, checked, onChange }) => {
  return (
    <div
      role="switch"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className="flex items-center justify-between py-2 cursor-pointer group border-b border-border-dim/30"
    >
      <span className="text-[11px] font-mono text-text-muted group-hover:text-text-primary transition-colors">
        {label}
      </span>
      <div
        className={`w-8 h-4 transition-colors flex items-center border ${
          checked
            ? "bg-primary/20 border-primary/40"
            : "bg-surface border-border-dim"
        }`}
      >
        <div
          className={`w-3 h-3 transition-all ${
            checked
              ? "translate-x-[18px] bg-primary"
              : "translate-x-[1px] bg-text-muted"
          }`}
        />
      </div>
    </div>
  );
};
