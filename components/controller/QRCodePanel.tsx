/**
 * QRCodePanel — QR Code 顯示面板
 *
 * 顯示 Display 端連接 QR Code，包含房間碼和下載功能。
 * 用於 Controller 頁面的側邊面板、Popover 和 Modal 三種 RWD 模式。
 */

"use client";

import { useRef, useCallback } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";

interface QRCodePanelProps {
  sessionCode: string;
  /** QR Code 尺寸（px），依容器自適應 */
  size?: number;
  className?: string;
}

export function QRCodePanel({ sessionCode, size = 160, className = "" }: QRCodePanelProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const displayUrl = typeof window !== "undefined"
    ? `${window.location.origin}/display?code=${sessionCode}`
    : "";

  const handleDownload = useCallback(() => {
    // QRCodeCanvas 渲染到 off-screen 的 canvas 中，直接讀取
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `LY-${sessionCode}.png`;
    link.href = url;
    link.click();
  }, [sessionCode]);

  if (!sessionCode) return null;

  return (
    <div className={`flex flex-col items-center gap-4 p-4 ${className}`}>
      {/* 標題 */}
      <p className="text-[11px] font-heading font-semibold text-primary tracking-wider uppercase">
        掃碼連接
      </p>

      {/* QR Code（顯示用 SVG） */}
      <div className="bg-white rounded-lg p-3">
        <QRCodeSVG
          value={displayUrl}
          size={size}
          level="M"
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>

      {/* Off-screen Canvas（下載用，不用 display:none 以確保 canvas 渲染） */}
      <div ref={canvasRef} className="absolute w-0 h-0 overflow-hidden">
        <QRCodeCanvas
          value={displayUrl}
          size={512}
          level="M"
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>

      {/* 房間碼 */}
      <p className="font-mono text-lg font-bold text-primary tracking-[0.3em]">
        {sessionCode}
      </p>

      {/* 說明 */}
      <p className="text-[10px] text-text-muted text-center">
        掃描後自動連接顯示端
      </p>

      {/* 下載按鈕 */}
      <button
        type="button"
        onClick={handleDownload}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg text-[11px] text-primary hover:bg-primary/20 hover:border-primary/50 transition-all cursor-pointer"
      >
        <Download size={12} strokeWidth={2} />
        下載 QR
      </button>
    </div>
  );
}
