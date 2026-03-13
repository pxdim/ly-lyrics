/**
 * ConnectionIndicator — 右上角連線狀態指示器
 *
 * 三態顯示：
 * - connected: 綠色 accent 脈搏 + 「已連接」
 * - reconnecting: 橘色脈搏 + 「重連中」
 * - disconnected: 紅色靜態 + 「已離線」
 */

"use client";

import { useLyricsStore } from "@/lib/store";

const stateConfig = {
  connected: {
    color: "#00FF88",
    borderColor: "rgba(0,255,136,0.3)",
    shadowClass: "shadow-glow-accent",
    label: "已連接",
    pulse: true,
  },
  reconnecting: {
    color: "#FF6B35",
    borderColor: "rgba(255,107,53,0.3)",
    shadowClass: "",
    label: "重連中",
    pulse: true,
  },
  disconnected: {
    color: "#EF4444",
    borderColor: "rgba(239,68,68,0.3)",
    shadowClass: "",
    label: "已離線",
    pulse: false,
  },
} as const;

export function ConnectionIndicator({ className = "" }: { className?: string }) {
  const connectionState = useLyricsStore((s) => s.connectionState);
  const config = stateConfig[connectionState];

  return (
    <div
      className={`flex items-center gap-3 bg-elevated/80 backdrop-blur-md rounded-full px-5 py-2 border ${config.shadowClass} ${className}`}
      style={{ borderColor: config.borderColor }}
    >
      <span className="relative flex h-2.5 w-2.5">
        {config.pulse && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: config.color }}
          />
        )}
        <span
          className="relative inline-flex rounded-full h-2.5 w-2.5"
          style={{ backgroundColor: config.color }}
        />
      </span>
      <span className="font-body text-xs font-medium" style={{ color: config.color }}>
        {config.label}
      </span>
    </div>
  );
}
