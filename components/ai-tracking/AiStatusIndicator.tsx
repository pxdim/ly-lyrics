"use client";

/**
 * AiStatusIndicator — AI 追蹤狀態指示器
 *
 * 顯示 5 種 AI 追蹤狀態，搭配廣播控制台設計風格。
 * 冷卻狀態顯示倒數計時（1 秒更新一次）。
 */

import { useEffect, useState } from "react";
import type { AiTrackingStatus } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface AiStatusIndicatorProps {
  status: AiTrackingStatus;
  confidence: number; // 0-1
  lastMatchedLine: number | null;
  cooldownUntil: number | null; // Unix ms timestamp
}

// ============================================================================
// Status Config
// ============================================================================

interface StatusConfig {
  label: string;
  dotClass: string;
  textClass: string;
  badgeClass: string;
}

const STATUS_CONFIG: Record<AiTrackingStatus, StatusConfig> = {
  idle: {
    label: "待機",
    dotClass: "bg-text-muted",
    textClass: "text-text-muted",
    badgeClass: "border-border-dim bg-surface text-text-muted",
  },
  listening: {
    label: "監聽中",
    dotClass: "bg-primary animate-pulse",
    textClass: "text-primary",
    badgeClass: "border-primary/30 bg-primary/5 text-primary",
  },
  matched: {
    label: "已匹配",
    dotClass: "bg-success",
    textClass: "text-success",
    badgeClass: "border-success/30 bg-success/5 text-success",
  },
  cooldown: {
    label: "冷卻中",
    dotClass: "bg-warning",
    textClass: "text-warning",
    badgeClass: "border-warning/30 bg-warning/5 text-warning",
  },
  error: {
    label: "錯誤",
    dotClass: "bg-error",
    textClass: "text-error",
    badgeClass: "border-error/30 bg-error/5 text-error",
  },
};

// ============================================================================
// Cooldown Timer Hook
// ============================================================================

function useCooldownSeconds(cooldownUntil: number | null): number {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (cooldownUntil === null) {
      setRemaining(0);
      return;
    }

    const update = () => {
      const diff = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setRemaining(diff);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  return remaining;
}

// ============================================================================
// Component
// ============================================================================

export function AiStatusIndicator({
  status,
  confidence,
  lastMatchedLine,
  cooldownUntil,
}: AiStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const cooldownSeconds = useCooldownSeconds(
    status === "cooldown" ? cooldownUntil : null
  );

  return (
    <div className="flex flex-col gap-1.5">
      {/* 主要狀態列 */}
      <div className={`flex items-center gap-2 px-2.5 py-1.5 border rounded ${config.badgeClass}`}>
        {/* 狀態指示點 */}
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`}
        />

        {/* 狀態標籤 */}
        <span className={`text-[11px] font-mono uppercase tracking-wider ${config.textClass}`}>
          {config.label}
          {status === "cooldown" && cooldownSeconds > 0 && (
            <span className="ml-1 tabular-nums">{cooldownSeconds}s</span>
          )}
        </span>

        {/* 信心度 / 行號（matched 狀態） */}
        {status === "matched" && (
          <span className="ml-auto text-[10px] font-mono text-success tabular-nums">
            {Math.round(confidence * 100)}%
          </span>
        )}

        {/* 監聽中：顯示信心度（若有） */}
        {status === "listening" && confidence > 0 && (
          <span className="ml-auto text-[10px] font-mono text-primary/70 tabular-nums">
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>

      {/* 次要資訊列（matched 狀態顯示行號） */}
      {status === "matched" && lastMatchedLine !== null && (
        <div className="flex items-center gap-2 px-2.5">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
            Line
          </span>
          <span className="text-[10px] font-mono text-success tabular-nums">
            {String(lastMatchedLine + 1).padStart(2, "0")}
          </span>
        </div>
      )}
    </div>
  );
}
