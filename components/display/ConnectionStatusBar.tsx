/**
 * ConnectionStatusBar — 斷線重連頂部提示條
 *
 * 根據 WebSocket 連線狀態顯示不同的頂部警告/提示橫幅。
 * connected: 不顯示（淡出）
 * reconnecting: 橘色提示，顯示重試次數
 * disconnected: 紅色警告，附「重試」按鈕
 */

"use client";

import { useEffect, useState } from "react";
import { useLyricsStore } from "@/lib/store";

export function ConnectionStatusBar() {
  const connectionState = useLyricsStore((s) => s.connectionState);
  const reconnectAttempt = useLyricsStore((s) => s.reconnectAttempt);
  const retryConnection = useLyricsStore((s) => s.retryConnection);

  // 連線成功後短暫顯示再淡出
  const [showConnected, setShowConnected] = useState(false);
  const [prevState, setPrevState] = useState(connectionState);

  useEffect(() => {
    if (prevState !== "connected" && connectionState === "connected") {
      // 從非 connected 變成 connected → 短暫顯示 "已恢復連線" 再淡出
      setShowConnected(true);
      const timer = setTimeout(() => setShowConnected(false), 2000);
      return () => clearTimeout(timer);
    }
    setPrevState(connectionState);
    return undefined;
  }, [connectionState, prevState]);

  // connected 且不需要顯示恢復提示 → 不渲染
  if (connectionState === "connected" && !showConnected) {
    return null;
  }

  // 恢復連線提示（淡出中）
  if (connectionState === "connected" && showConnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-[fadeOut_2s_ease-out_forwards]">
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-[#00FF8818] to-[#00FF8808] border-b border-[#00FF8830]">
          <span className="inline-block w-2 h-2 rounded-full bg-accent" />
          <span className="text-accent text-xs font-medium">連線已恢復</span>
        </div>
      </div>
    );
  }

  // 重連中
  if (connectionState === "reconnecting") {
    return (
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-[#FF6B3520] to-[#FF6B3510] border-b border-[#FF6B3530]">
          <span className="inline-block w-2 h-2 rounded-full bg-warning animate-pulse" />
          <span className="text-warning text-xs font-medium">
            連線中斷 · 重新連接中 ({reconnectAttempt}/5)
          </span>
        </div>
      </div>
    );
  }

  // 連線失敗（重連耗盡）
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-center gap-3 py-2 px-4 bg-gradient-to-r from-[#EF444425] to-[#EF444410] border-b border-[#EF444440]">
        <span className="text-error text-sm">✕</span>
        <span className="text-error text-xs font-medium">無法連線</span>
        <button
          type="button"
          onClick={retryConnection}
          className="ml-2 px-3 py-1 bg-[#EF444420] border border-[#EF444440] rounded-md text-[10px] text-error hover:bg-[#EF444430] transition-colors cursor-pointer"
        >
          重試
        </button>
      </div>
    </div>
  );
}
