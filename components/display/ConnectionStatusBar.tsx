/**
 * ConnectionStatusBar — 連線狀態頂部提示條
 *
 * 根據 WebSocket 連線狀態與網路連線狀態顯示不同的頂部警告/提示橫幅。
 * offline (NFR2.4): 黃色提示，顯示「離線模式」+ 歌詞停留說明
 * connected: 不顯示（淡出）
 * reconnecting: 橘色提示，顯示重試次數
 * disconnected: 紅色警告，附「重試」按鈕
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useLyricsStore } from "@/lib/store";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useTranslations } from "next-intl";

export function ConnectionStatusBar() {
  const t = useTranslations("display.connection");
  const tOffline = useTranslations("offline");
  const tc = useTranslations("common");
  const connectionState = useLyricsStore((s) => s.connectionState);
  const reconnectAttempt = useLyricsStore((s) => s.reconnectAttempt);
  const retryConnection = useLyricsStore((s) => s.retryConnection);
  const isOnline = useOnlineStatus();

  // 連線成功後短暫顯示再淡出
  const [showConnected, setShowConnected] = useState(false);
  const prevStateRef = useRef(connectionState);

  useEffect(() => {
    if (prevStateRef.current !== "connected" && connectionState === "connected") {
      // 從非 connected 變成 connected → 短暫顯示 "已恢復連線" 再淡出
      setShowConnected(true);
      const timer = setTimeout(() => setShowConnected(false), 2000);
      prevStateRef.current = connectionState;
      return () => clearTimeout(timer);
    }
    prevStateRef.current = connectionState;
    return undefined;
  }, [connectionState]);

  // 離線模式提示 (NFR2.4) — 無論 WebSocket 狀態，瀏覽器離線時顯示
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-warning/10 border-b border-warning/20">
          <span className="inline-block w-2 h-2 rounded-full bg-warning" />
          <span className="text-warning text-xs font-medium">{tOffline("offlineMode")}</span>
          <span className="text-warning text-xs">· {tOffline("lyricsStayHint")}</span>
        </div>
      </div>
    );
  }

  // connected 且不需要顯示恢復提示 → 不渲染
  if (connectionState === "connected" && !showConnected) {
    return null;
  }

  // 恢復連線提示（淡出中）
  if (connectionState === "connected" && showConnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-fade-out-slow">
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-accent/10 border-b border-accent/20">
          <span className="inline-block w-2 h-2 rounded-full bg-accent" />
          <span className="text-accent text-xs font-medium">{t("restored")}</span>
        </div>
      </div>
    );
  }

  // 重連中
  if (connectionState === "reconnecting") {
    return (
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-warning/10 border-b border-warning/20">
          <span className="inline-block w-2 h-2 rounded-full bg-warning animate-pulse" />
          <span className="text-warning text-xs font-medium">
            {t("interrupted")} ({reconnectAttempt})
          </span>
        </div>
      </div>
    );
  }

  // 連線失敗（重連耗盡）
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-center gap-3 py-2 px-4 bg-error/10 border-b border-error/25">
        <span className="text-error text-sm">✕</span>
        <span className="text-error text-xs font-medium">{t("failed")}</span>
        <button
          type="button"
          onClick={retryConnection}
          className="ml-2 px-3 py-1 bg-error/10 border border-error/25 rounded-md text-[10px] text-error hover:bg-error/20 transition-colors cursor-pointer"
        >
          {tc("retry")}
        </button>
      </div>
    </div>
  );
}
