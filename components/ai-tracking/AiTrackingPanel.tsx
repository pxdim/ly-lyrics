"use client";

/**
 * AiTrackingPanel — AI 監聽主控面板
 *
 * 組合 AiStatusIndicator 與 AudioInputSelector，
 * 提供開關切換與設定入口。收合狀態只顯示切換鈕列。
 */

import { useCallback } from "react";
import { Settings } from "lucide-react";
import { useLyricsStore } from "@/lib/store";
import { AiStatusIndicator } from "./AiStatusIndicator";
import { AudioInputSelector } from "./AudioInputSelector";

// ============================================================================
// Types
// ============================================================================

export interface AiTrackingPanelProps {
  onToggle: (active: boolean) => void;
  onSettingsClick: () => void;
}

// ============================================================================
// Toggle Switch 子元件（純 CSS，無 native checkbox）
// ============================================================================

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#090A0C] ${
        checked ? "bg-primary" : "bg-[#2A2D35]"
      }`}
    >
      <span
        className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

// ============================================================================
// Main Panel Component
// ============================================================================

export function AiTrackingPanel({ onToggle, onSettingsClick }: AiTrackingPanelProps) {
  const aiTracking = useLyricsStore((s) => s.aiTracking);
  const audioInput = useLyricsStore((s) => s.audioInput);
  const updateAudioInput = useLyricsStore((s) => s.updateAudioInput);
  const startAiTracking = useLyricsStore((s) => s.startAiTracking);
  const stopAiTracking = useLyricsStore((s) => s.stopAiTracking);

  const isActive = aiTracking.isActive;

  const handleToggle = useCallback((value: boolean) => {
    if (value) {
      startAiTracking();
    } else {
      stopAiTracking();
    }
    onToggle(value);
  }, [startAiTracking, stopAiTracking, onToggle]);

  // Memoize callbacks 避免音量輪詢（~60fps）觸發不必要的重渲染
  const handleDeviceChange = useCallback(
    (deviceId: string) => updateAudioInput({ deviceId }),
    [updateAudioInput]
  );

  const handleGainChange = useCallback(
    (gain: number) => updateAudioInput({ gain }),
    [updateAudioInput]
  );

  return (
    <div className="border border-[#2A2D35] rounded-lg p-3 bg-[#16181D]/50">
      {/* 標題列：標籤 + 開關 + 設定 */}
      <div className="flex items-center justify-between gap-2">
        {/* 左：標籤 + 狀態點（激活時） */}
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
          )}
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
            AI 監聽
          </span>
        </div>

        {/* 右：設定齒輪 + 切換開關 */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onSettingsClick}
            className="p-1 text-[#6B7280] hover:text-[#E4E7EB] transition-colors"
            title="AI 監聽設定"
            aria-label="開啟 AI 監聽設定"
          >
            <Settings size={13} />
          </button>

          <ToggleSwitch
            checked={isActive}
            onChange={handleToggle}
            label="切換 AI 監聽"
          />
        </div>
      </div>

      {/* 展開內容：只在激活時顯示 */}
      {isActive && (
        <div className="mt-3 flex flex-col gap-3 border-t border-[#2A2D35] pt-3">
          {/* 音訊輸入選擇器 */}
          <AudioInputSelector
            deviceId={audioInput.deviceId}
            gain={audioInput.gain}
            volume={audioInput.volume}
            isCapturing={audioInput.isCapturing}
            onDeviceChange={handleDeviceChange}
            onGainChange={handleGainChange}
          />

          {/* 分隔線 */}
          <div className="h-px bg-[#2A2D35]" />

          {/* 狀態指示器 */}
          <AiStatusIndicator
            status={aiTracking.status}
            confidence={aiTracking.confidence}
            lastMatchedLine={aiTracking.lastMatchedLine}
            cooldownUntil={aiTracking.cooldownUntil}
          />
        </div>
      )}
    </div>
  );
}
