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
import { useTranslations } from "next-intl";

const stateConfig = {
  connected: {
    dotClass: "bg-accent",
    textClass: "text-accent",
    borderClass: "border-accent/30",
    shadowClass: "shadow-glow-accent",
    labelKey: "connected" as const,
    pulse: true,
  },
  reconnecting: {
    dotClass: "bg-warning",
    textClass: "text-warning",
    borderClass: "border-warning/30",
    shadowClass: "",
    labelKey: "reconnecting" as const,
    pulse: true,
  },
  disconnected: {
    dotClass: "bg-error",
    textClass: "text-error",
    borderClass: "border-error/30",
    shadowClass: "",
    labelKey: "disconnected" as const,
    pulse: false,
  },
} as const;

export function ConnectionIndicator({ className = "" }: { className?: string }) {
  const t = useTranslations("display.connection");
  const connectionState = useLyricsStore((s) => s.connectionState);
  const config = stateConfig[connectionState];

  return (
    <div
      className={`flex items-center gap-3 bg-elevated/80 backdrop-blur-md rounded-full px-5 py-2 border ${config.borderClass} ${config.shadowClass} ${className}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {config.pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotClass}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.dotClass}`}
        />
      </span>
      <span className={`font-body text-xs font-medium ${config.textClass}`}>
        {t(config.labelKey)}
      </span>
    </div>
  );
}
