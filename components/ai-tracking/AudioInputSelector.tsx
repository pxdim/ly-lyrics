"use client";

/**
 * AudioInputSelector — 音訊輸入選擇器
 *
 * 功能：
 * - 枚舉 audioinput 裝置並顯示下拉選單
 * - 增益調整滑桿（0-20 dB）
 * - 即時音量計（顏色根據音量等級變化）
 */

import { useEffect, useState, useCallback } from "react";
import { Volume2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface AudioInputSelectorProps {
  deviceId: string | null;
  gain: number; // 0-20 dB
  volume: number; // 0-1（即時音量）
  isCapturing?: boolean;
  onDeviceChange: (deviceId: string) => void;
  onGainChange: (gain: number) => void;
}

// ============================================================================
// Volume Meter Color
// ============================================================================

function getVolumeMeterClass(volume: number): string {
  // volume 為 0-1
  if (volume >= 0.8) return "bg-red-500";
  if (volume >= 0.5) return "bg-amber-400";
  return "bg-emerald-400";
}

// ============================================================================
// Component
// ============================================================================

export function AudioInputSelector({
  deviceId,
  gain,
  volume,
  isCapturing,
  onDeviceChange,
  onGainChange,
}: AudioInputSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // 枚舉音訊輸入裝置
  const enumerateDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter((d) => d.kind === "audioinput");
      setDevices(audioInputs);

      // 若尚未選擇裝置且有可用裝置，自動選第一個
      if (deviceId === null && audioInputs.length > 0) {
        const first = audioInputs[0];
        if (first !== undefined) {
          onDeviceChange(first.deviceId);
        }
      }
    } catch (err) {
      console.error("枚舉音訊裝置失敗:", err);
      setPermissionDenied(true);
    }
  }, [deviceId, onDeviceChange]);

  useEffect(() => {
    enumerateDevices();

    // 當裝置變更時重新枚舉（例如插拔麥克風）
    navigator.mediaDevices?.addEventListener("devicechange", enumerateDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", enumerateDevices);
    };
  }, [enumerateDevices]);

  // 音量計百分比（0-100）
  const volumePct = Math.round(Math.min(1, Math.max(0, volume)) * 100);
  const meterColorClass = getVolumeMeterClass(volume);

  return (
    <div className="flex flex-col gap-2.5">
      {/* 裝置選擇 */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-mono text-[#6B7280] uppercase tracking-wider">
          Input Device
        </label>

        {permissionDenied ? (
          <div className="px-2.5 py-1.5 border border-[#2A2D35] bg-[#090A0C] text-[11px] font-mono text-red-400">
            麥克風存取被拒絕
          </div>
        ) : (
          <select
            value={deviceId ?? ""}
            onChange={(e) => {
              if (e.target.value) onDeviceChange(e.target.value);
            }}
            disabled={isCapturing}
            className={`w-full px-2.5 py-1.5 bg-[#090A0C] border border-[#2A2D35] text-[12px] font-mono text-[#E4E7EB] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors appearance-none truncate ${
              isCapturing ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-[#6B7280]"
            }`}
            aria-label="音訊輸入裝置"
          >
            {devices.length === 0 ? (
              <option value="">偵測裝置中...</option>
            ) : (
              devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `麥克風 ${device.deviceId.slice(0, 6)}`}
                </option>
              ))
            )}
          </select>
        )}
      </div>

      {/* 增益滑桿 */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono text-[#6B7280] uppercase tracking-wider">
            Gain
          </label>
          <span className="text-[10px] font-mono text-[#E4E7EB] tabular-nums">
            {gain >= 0 ? "+" : ""}{gain} dB
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={gain}
          onChange={(e) => onGainChange(Number(e.target.value))}
          className="w-full h-1.5 appearance-none bg-[#2A2D35] rounded-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-none
            [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-colors
            [&::-moz-range-thumb]:w-3
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:rounded-none
            [&::-moz-range-thumb]:bg-primary
            [&::-moz-range-thumb]:cursor-pointer"
          aria-label="增益調整"
        />
        <div className="flex justify-between text-[9px] font-mono text-[#6B7280]">
          <span>0</span>
          <span>10</span>
          <span>20 dB</span>
        </div>
      </div>

      {/* 音量計 */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Volume2
              size={10}
              className={isCapturing ? "text-[#E4E7EB]" : "text-[#6B7280]"}
            />
            <span className="text-[10px] font-mono text-[#6B7280] uppercase tracking-wider">
              Level
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#6B7280] tabular-nums">
            {volumePct}%
          </span>
        </div>

        {/* 音量條容器 */}
        <div className="relative h-[3px] w-full bg-[#2A2D35] overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 transition-all duration-100 ${meterColorClass}`}
            style={{ width: `${volumePct}%` }}
          />
        </div>

        {/* 音量等級刻度標記 */}
        <div className="flex justify-between text-[9px] font-mono text-[#2A2D35]">
          <span>0</span>
          <span className="text-amber-900/80">50</span>
          <span className="text-red-900/80">80</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
