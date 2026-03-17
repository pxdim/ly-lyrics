"use client";

/**
 * AiTrackingPanel — AI 自動跟歌主控面板
 *
 * 組合 AiStatusIndicator 與 AudioInputSelector，
 * 提供開關切換與設定入口。齒輪按鈕展開進階設定。
 */

import { useState, useCallback } from "react";
import { Settings, ChevronDown } from "lucide-react";
import { useLyricsStore } from "@/lib/store";
import { AiStatusIndicator } from "./AiStatusIndicator";
import { AudioInputSelector } from "./AudioInputSelector";

// ============================================================================
// Types
// ============================================================================

export interface AiTrackingPanelProps {
  onToggle: (active: boolean) => void;
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
      className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
        checked ? "bg-primary" : "bg-border-dim"
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
// 進階設定子元件
// ============================================================================

function AdvancedSettings() {
  const aiSettings = useLyricsStore((s) => s.aiSettings);
  const updateAiSettings = useLyricsStore((s) => s.updateAiSettings);

  return (
    <div className="flex flex-col gap-2.5 text-[11px]">
      {/* 辨識引擎 */}
      <div className="flex items-center justify-between">
        <span className="text-text-muted">辨識引擎</span>
        <select
          value={aiSettings.sttProvider}
          onChange={(e) => updateAiSettings({ sttProvider: e.target.value as "google-cloud" | "web-speech" | "deepgram" })}
          className="bg-elevated border border-border-dim text-text-primary text-[10px] font-mono rounded px-1.5 py-0.5 focus:outline-none focus:border-primary"
        >
          <option value="google-cloud">Google Cloud STT</option>
          <option value="web-speech">Web Speech (免費)</option>
          <option value="deepgram">Deepgram</option>
        </select>
      </div>

      {/* 信心門檻 */}
      <div className="flex items-center justify-between">
        <span className="text-text-muted">比對門檻</span>
        <div className="flex items-center gap-1.5">
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.05}
            value={aiSettings.confidenceThreshold}
            onChange={(e) => updateAiSettings({ confidenceThreshold: Number(e.target.value) })}
            className="w-16 h-1 accent-primary bg-border-dim rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          />
          <span className="text-text-primary font-mono w-7 text-right">
            {(aiSettings.confidenceThreshold * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 搜尋視窗 */}
      <div className="flex items-center justify-between">
        <span className="text-text-muted">搜尋範圍</span>
        <span className="text-text-primary font-mono">
          前{aiSettings.windowBefore} / 後{aiSettings.windowAfter}行
        </span>
      </div>

      {/* 冷卻時間 */}
      <div className="flex items-center justify-between">
        <span className="text-text-muted">手動冷卻</span>
        <div className="flex items-center gap-1.5">
          <input
            type="range"
            min={1000}
            max={10000}
            step={500}
            value={aiSettings.manualOverrideCooldown}
            onChange={(e) => updateAiSettings({ manualOverrideCooldown: Number(e.target.value) })}
            className="w-16 h-1 accent-primary bg-border-dim rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          />
          <span className="text-text-primary font-mono w-7 text-right">
            {(aiSettings.manualOverrideCooldown / 1000).toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Panel Component
// ============================================================================

export function AiTrackingPanel({ onToggle }: AiTrackingPanelProps) {
  const aiTracking = useLyricsStore((s) => s.aiTracking);
  const audioInput = useLyricsStore((s) => s.audioInput);
  const updateAudioInput = useLyricsStore((s) => s.updateAudioInput);
  const [showSettings, setShowSettings] = useState(false);

  const isActive = aiTracking.isActive;

  // Store 狀態由 useAiTracking hook 統一管理，Panel 只負責通知
  const handleToggle = useCallback((value: boolean) => {
    onToggle(value);
  }, [onToggle]);

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
    <div className="border border-border-dim rounded-lg p-3 bg-elevated/50">
      {/* 標題列：標籤 + 開關 + 設定 */}
      <div className="flex items-center justify-between gap-2">
        {/* 左：標籤 + 狀態點（激活時） */}
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
          )}
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
            AI 自動跟歌
          </span>
        </div>

        {/* 右：設定齒輪 + 切換開關 */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            className={`p-1 transition-colors ${
              showSettings ? "text-primary" : "text-text-muted hover:text-text-primary"
            }`}
            title="AI 自動跟歌設定"
            aria-label="展開 AI 自動跟歌設定"
            aria-expanded={showSettings}
          >
            <Settings size={13} />
          </button>

          <ToggleSwitch
            checked={isActive}
            onChange={handleToggle}
            label="切換 AI 自動跟歌"
          />
        </div>
      </div>

      {/* 錯誤訊息 */}
      {aiTracking.errorMessage && !isActive && (
        <div className="mt-2 text-[10px] text-red-400 font-mono">
          {aiTracking.errorMessage}
        </div>
      )}

      {/* 進階設定（齒輪展開） */}
      {showSettings && (
        <div className="mt-3 border-t border-border-dim pt-3">
          <div className="flex items-center gap-1 mb-2">
            <ChevronDown size={10} className="text-text-muted" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              進階設定
            </span>
          </div>
          <AdvancedSettings />
        </div>
      )}

      {/* 展開內容：只在激活時顯示 */}
      {isActive && (
        <div className="mt-3 flex flex-col gap-3 border-t border-border-dim pt-3">
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
          <div className="h-px bg-border-dim" />

          {/* 狀態指示器 */}
          <AiStatusIndicator
            status={aiTracking.status}
            confidence={aiTracking.confidence}
            lastMatchedLine={aiTracking.lastMatchedLine}
            cooldownUntil={aiTracking.cooldownUntil}
          />

          {/* 即時逐字稿 */}
          {aiTracking.lastTranscript && (
            <>
              <div className="h-px bg-border-dim" />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    STT 辨識
                  </span>
                  <span className={`text-[9px] font-mono px-1 rounded ${
                    aiTracking.lastTranscriptFinal
                      ? "bg-primary/20 text-primary"
                      : "bg-border-dim text-text-muted"
                  }`}>
                    {aiTracking.lastTranscriptFinal ? "FINAL" : "INTERIM"}
                  </span>
                </div>
                <p className={`text-[11px] font-mono leading-relaxed break-all ${
                  aiTracking.lastTranscriptFinal ? "text-text-primary" : "text-text-muted italic"
                }`}>
                  {aiTracking.lastTranscript}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
