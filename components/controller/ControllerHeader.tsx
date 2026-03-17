/**
 * ControllerHeader — 控制台頂部狀態列
 *
 * 包含桌面/平板版 StatusBar 和手機版 MobileStatusBar 兩種變體。
 * 顯示房間碼、連線狀態、裝置計數、QR Code 按鈕等。
 */

"use client";

import { useState, useCallback, type FC } from "react";
import { useLyricsStore } from "@/lib/store";
import { QRCodePanel } from "@/components/controller/QRCodePanel";

// ============================================================================
// 桌面/平板版狀態列
// ============================================================================

interface StatusBarProps {
  /** 房間碼 */
  sessionCode: string;
  /** 重新產生房間碼回呼 */
  onRegenerate: () => void;
}

export const StatusBar: FC<StatusBarProps> = ({
  sessionCode,
  onRegenerate,
}) => {
  const isConnected = useLyricsStore(
    (state) => state.connectionState === "connected",
  );
  const controllerCount = useLyricsStore((state) => state.controllerCount);
  const displayCount = useLyricsStore((state) => state.displayCount);
  const currentSong = useLyricsStore((state) => state.currentSong);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [showQR, setShowQR] = useState(false);

  const copyToClipboard = useCallback(
    async (type: "code" | "link") => {
      const text =
        type === "code"
          ? sessionCode
          : `${window.location.origin}/display?code=${sessionCode}`;
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    },
    [sessionCode],
  );

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-border-dim bg-elevated px-6 py-2 shrink-0 h-12">
      {/* 左：標題 + 房間碼 */}
      <div className="flex items-center gap-4">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <h2 className="text-[16px] font-semibold leading-tight tracking-[-0.015em]">
          Control Desk
        </h2>

        {/* 房間碼：點擊複製 */}
        <div className="flex items-center gap-1.5 ml-2">
          <button
            type="button"
            onClick={() => copyToClipboard("code")}
            className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-md hover:bg-primary/20 hover:border-primary/50 transition-all group cursor-pointer"
            title="點擊複製房間碼"
          >
            <span className="text-[11px] font-mono text-primary/70 uppercase tracking-wider">
              Room
            </span>
            <span className="text-[15px] font-mono font-bold text-primary tracking-[0.2em]">
              {sessionCode}
            </span>
            {/* 複製圖示 */}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary/50 group-hover:text-primary transition-colors"
            >
              {copied === "code" ? (
                <path d="M20 6L9 17l-5-5" />
              ) : (
                <>
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </>
              )}
            </svg>
          </button>

          {/* 複製顯示端連結按鈕 */}
          <button
            type="button"
            onClick={() => copyToClipboard("link")}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border-dim rounded-md hover:border-primary/40 hover:bg-primary/5 transition-all text-[11px] font-mono text-text-muted hover:text-primary cursor-pointer"
            title="複製顯示端連結"
          >
            {/* 連結圖示 */}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {copied === "link" ? (
                <path d="M20 6L9 17l-5-5" />
              ) : (
                <>
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </>
              )}
            </svg>
            {copied === "link" ? "已複製" : "複製連結"}
          </button>

          {/* 重新產生房間碼 */}
          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border-dim rounded-md hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-[11px] font-mono text-text-muted hover:text-amber-400 cursor-pointer"
            title="重新產生房間碼（所有接收端需重新連線）"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0115.36-6.36L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 01-15.36 6.36L3 16" />
            </svg>
            新房間
          </button>

          {/* QR Code 按鈕（平板/手機用） */}
          <div className="relative xl:hidden">
            <button
              type="button"
              onClick={() => setShowQR(!showQR)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border-dim rounded-md hover:border-primary/40 hover:bg-primary/5 transition-all text-[11px] font-mono text-text-muted hover:text-primary cursor-pointer"
              title="顯示 QR Code"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="3" height="3" />
                <path d="M21 14h-3v3" />
                <path d="M21 21h-3v-3" />
              </svg>
              QR
            </button>

            {/* Popover (平板) / Modal (手機) */}
            {showQR && (
              <>
                {/* 背景遮罩 — 手機為半透明，平板為透明（僅用於 click-outside） */}
                <div
                  className="fixed inset-0 z-40 bg-black/50 md:bg-transparent"
                  onClick={() => setShowQR(false)}
                />

                {/* 手機：居中 Modal */}
                <div className="fixed inset-0 z-50 flex items-center justify-center md:hidden">
                  <div className="bg-elevated border border-border-dim rounded-2xl shadow-xl">
                    <QRCodePanel sessionCode={sessionCode} size={200} />
                    <div className="px-4 pb-3 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setShowQR(false)}
                        className="px-4 py-1.5 text-xs text-text-muted hover:text-white transition-colors cursor-pointer"
                      >
                        關閉
                      </button>
                    </div>
                  </div>
                </div>

                {/* 平板：Popover 下拉 */}
                <div className="hidden md:block absolute right-0 top-full mt-2 z-50 bg-elevated border border-border-dim rounded-xl shadow-xl">
                  <QRCodePanel sessionCode={sessionCode} size={140} />
                </div>
              </>
            )}
          </div>
        </div>

        {currentSong && (
          <span className="text-[12px] font-mono border border-border-dim px-2 py-0.5 bg-surface text-text-muted ml-2 truncate max-w-[200px]">
            {currentSong.title}
            {currentSong.artist ? ` — ${currentSong.artist}` : ""}
          </span>
        )}
      </div>

      {/* 右：連線狀態 */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-primary animate-pulse" : "bg-red-500"}`}
          />
          <span
            className={`text-[12px] font-mono ${isConnected ? "text-primary" : "text-red-400"}`}
          >
            {isConnected ? "SYSTEM READY" : "OFFLINE"}
          </span>
        </div>
        <div className="h-5 w-px bg-border-dim" />
        <div className="flex items-center gap-4 text-[12px] font-mono text-text-muted">
          <span className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            WS
          </span>
          <span className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="0" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            CTL: {controllerCount}
          </span>
          <span className="flex items-center gap-1.5 text-primary">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            DSP: {displayCount}
          </span>
        </div>
      </div>
    </header>
  );
};

// ============================================================================
// 手機版精簡狀態列（高度 h-11）
// ============================================================================

interface MobileStatusBarProps {
  /** 房間碼 */
  sessionCode: string;
  /** 是否已連線 */
  isConnected: boolean;
}

export const MobileStatusBar: FC<MobileStatusBarProps> = ({
  sessionCode,
  isConnected,
}) => {
  const [copied, setCopied] = useState(false);

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sessionCode]);

  return (
    <header className="flex items-center justify-between border-b border-border-dim bg-elevated px-4 shrink-0 h-11">
      {/* 左：標題 + 房間碼 */}
      <div className="flex items-center gap-3">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary shrink-0"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <button
          type="button"
          onClick={copyCode}
          className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/30 rounded-md active:bg-primary/20 transition-all"
          title="點擊複製房間碼"
        >
          <span className="text-[10px] font-mono text-primary/70 uppercase tracking-wider">
            Room
          </span>
          <span className="text-[13px] font-mono font-bold text-primary tracking-[0.15em]">
            {sessionCode}
          </span>
          {copied && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-primary"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>
      </div>

      {/* 右：連線狀態指示燈 */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? "bg-primary animate-pulse" : "bg-red-500"}`}
        />
        <span
          className={`text-[11px] font-mono ${isConnected ? "text-primary" : "text-red-400"}`}
        >
          {isConnected ? "ON" : "OFF"}
        </span>
      </div>
    </header>
  );
};

// ============================================================================
// 手機版 QR 分頁
// ============================================================================

interface MobileQRTabProps {
  /** 房間碼 */
  sessionCode: string;
  /** 重新產生房間碼回呼 */
  onRegenerate: () => void;
}

export const MobileQRTab: FC<MobileQRTabProps> = ({
  sessionCode,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    const link = `${window.location.origin}/display?code=${sessionCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sessionCode]);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
      <QRCodePanel sessionCode={sessionCode} size={200} />

      {/* 複製顯示端連結 */}
      <button
        type="button"
        onClick={copyLink}
        className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-[12px] font-mono text-primary active:bg-primary/20 transition-all"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {copied ? (
            <path d="M20 6L9 17l-5-5" />
          ) : (
            <>
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </>
          )}
        </svg>
        {copied ? "已複製連結" : "複製顯示端連結"}
      </button>

      {/* 重新產生房間碼 */}
      <button
        type="button"
        onClick={onRegenerate}
        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-dim rounded-lg text-[12px] font-mono text-text-muted active:bg-amber-500/5 active:border-amber-500/40 active:text-amber-400 transition-all"
        title="重新產生房間碼（所有接收端需重新連線）"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 2v6h-6" />
          <path d="M3 12a9 9 0 0115.36-6.36L21 8" />
          <path d="M3 22v-6h6" />
          <path d="M21 12a9 9 0 01-15.36 6.36L3 16" />
        </svg>
        新房間
      </button>
    </div>
  );
};
