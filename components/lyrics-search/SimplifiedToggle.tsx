"use client";

import { type FC } from "react";

interface SimplifiedToggleProps {
  isTraditional: boolean;
  onToggle: () => void;
}

export const SimplifiedToggle: FC<SimplifiedToggleProps> = ({ isTraditional, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 text-[12px] font-mono border transition-colors ${
        isTraditional
          ? "bg-primary/10 border-primary/40 text-primary"
          : "bg-transparent border-[#2A2D35] text-[#6B7280] hover:border-primary/30"
      }`}
    >
      🔄 {isTraditional ? "顯示原文" : "轉繁體"}
    </button>
  );
};
