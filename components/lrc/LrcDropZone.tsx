/**
 * LRC 拖放上傳元件
 *
 * 支援拖放 .lrc 檔案或點擊選檔，解析後自動呼叫 API 建立歌曲。
 * 核心處理邏輯委託給 processLrcFile，元件只管理 UI 狀態。
 *
 * @module components/lrc/LrcDropZone
 */

"use client";

import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import { Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { processLrcFile, LrcImportError } from "@/lib/lrc/import";

// ============================================================================
// Types
// ============================================================================

interface LrcDropZoneProps {
  /** 匯入成功後的回呼（用於刷新歌曲列表） */
  onImportSuccess?: () => void;
}

/** 元件內部狀態 */
type DropZoneStatus = "idle" | "parsing" | "success" | "error";

// ============================================================================
// 元件
// ============================================================================

export function LrcDropZone({ onImportSuccess }: LrcDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<DropZoneStatus>("idle");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------------------------
  // 檔案處理
  // --------------------------------------------------------------------------

  const handleFile = useCallback(async (file: File) => {
    setStatus("parsing");
    setMessage("");

    try {
      const result = await processLrcFile(file);
      setStatus("success");
      setMessage(`已成功匯入「${result.title}」（${result.lyricsCount} 行）`);
      onImportSuccess?.();
    } catch (err) {
      setStatus("error");
      if (err instanceof LrcImportError) {
        setMessage(err.message);
      } else {
        setMessage(err instanceof Error ? err.message : "匯入失敗");
      }
    }
  }, [onImportSuccess]);

  // --------------------------------------------------------------------------
  // Drag 事件處理
  // --------------------------------------------------------------------------

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  // --------------------------------------------------------------------------
  // 點擊選檔
  // --------------------------------------------------------------------------

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // 重置 input 以允許重複選擇同一檔案
    e.target.value = "";
  }, [handleFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // --------------------------------------------------------------------------
  // 渲染
  // --------------------------------------------------------------------------

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      className={`border-2 border-dashed rounded p-3 text-center transition-colors cursor-pointer ${
        isDragging
          ? "border-cyan-400 bg-cyan-900/20"
          : "border-[#2A2D35] hover:border-[#6B7280]"
      }`}
      data-testid="lrc-drop-zone"
    >
      {/* 隱藏的 file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".lrc"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="lrc-file-input"
      />

      {/* idle 狀態：上傳提示 */}
      {status === "idle" && (
        <div className="flex items-center justify-center gap-2 text-[#6B7280]">
          <Upload className="w-4 h-4" />
          <span className="text-[11px] font-mono">拖放 .lrc 匯入</span>
        </div>
      )}

      {/* parsing 狀態：載入動畫 */}
      {status === "parsing" && (
        <div className="flex items-center justify-center gap-2 text-cyan-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[11px] font-mono">解析中...</span>
        </div>
      )}

      {/* success 狀態：成功確認 */}
      {status === "success" && (
        <div className="flex items-center justify-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-[11px] font-mono">{message}</span>
        </div>
      )}

      {/* error 狀態：錯誤訊息 */}
      {status === "error" && (
        <div className="flex items-center justify-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-[11px] font-mono">{message}</span>
        </div>
      )}
    </div>
  );
}
