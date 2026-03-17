"use client";

/**
 * AudioInputSelector — 音訊輸入選擇器
 *
 * 功能：
 * - 枚舉 audioinput 裝置並顯示下拉選單（含 Audio Interface）
 * - 增益調整滑桿（0-20 dB）
 * - 專業 dBFS 音量計（分段式 LED 風格，綠/黃/紅三色區）
 */

import { useEffect, useState, useCallback } from "react";
import { Volume2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface AudioInputSelectorProps {
  deviceId: string | null;
  gain: number; // 0-20 dB
  volume: number; // 0-1（即時 RMS 音量）
  isCapturing?: boolean;
  onDeviceChange: (deviceId: string) => void;
  onGainChange: (gain: number) => void;
}

// ============================================================================
// dBFS 換算工具
// ============================================================================

const METER_MIN_DB = -48;
const METER_MAX_DB = 0;

/** 線性音量（0-1 RMS）→ dBFS */
function volumeToDbfs(volume: number): number {
  if (volume <= 0.0001) return METER_MIN_DB;
  return Math.max(METER_MIN_DB, 20 * Math.log10(volume));
}

/** dBFS → 音量計位置百分比（0-100） */
function dbfsToPercent(dbfs: number): number {
  const clamped = Math.max(METER_MIN_DB, Math.min(METER_MAX_DB, dbfs));
  return ((clamped - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB)) * 100;
}

// 色段邊界（dBFS）
const YELLOW_THRESHOLD = -18; // 62.5% 位置
const RED_THRESHOLD = -6;     // 87.5% 位置

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

    // 當裝置變更時重新枚舉（例如插拔麥克風/Audio Interface）
    navigator.mediaDevices?.addEventListener("devicechange", enumerateDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", enumerateDevices);
    };
  }, [enumerateDevices]);

  // dBFS 計算
  const dbfs = volumeToDbfs(volume);
  const meterPct = dbfsToPercent(dbfs);
  const dbfsDisplay = dbfs <= METER_MIN_DB ? "-∞" : dbfs.toFixed(1);

  // 音量條顏色：根據當前 dBFS 決定填充端的顏色
  const meterColor =
    dbfs >= RED_THRESHOLD
      ? "bg-red-500"
      : dbfs >= YELLOW_THRESHOLD
        ? "bg-amber-400"
        : "bg-emerald-400";

  return (
    <div className="flex flex-col gap-2.5">
      {/* 裝置選擇 */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
          Input Device
        </label>

        {permissionDenied ? (
          <div className="px-2.5 py-1.5 border border-border-dim bg-surface text-[11px] font-mono text-red-400">
            麥克風存取被拒絕
          </div>
        ) : (
          <select
            value={deviceId ?? ""}
            onChange={(e) => {
              if (e.target.value) onDeviceChange(e.target.value);
            }}
            disabled={isCapturing}
            className={`w-full px-2.5 py-1.5 bg-surface border border-border-dim text-[12px] font-mono text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors appearance-none truncate ${
              isCapturing ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-text-muted"
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
          <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
            Gain
          </label>
          <span className="text-[10px] font-mono text-text-primary tabular-nums">
            +{gain} dB
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={gain}
          onChange={(e) => onGainChange(Number(e.target.value))}
          className="w-full h-1.5 appearance-none bg-border-dim rounded-none cursor-pointer
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
        <div className="flex justify-between text-[9px] font-mono text-text-muted">
          <span>0</span>
          <span>+10</span>
          <span>+20 dB</span>
        </div>
      </div>

      {/* 專業 dBFS 音量計 */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Volume2
              size={10}
              className={isCapturing ? "text-text-primary" : "text-text-muted"}
            />
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
              Level
            </span>
          </div>
          <span className={`text-[10px] font-mono tabular-nums ${
            dbfs >= RED_THRESHOLD
              ? "text-red-400"
              : dbfs >= YELLOW_THRESHOLD
                ? "text-amber-400"
                : "text-text-muted"
          }`}>
            {dbfsDisplay} dBFS
          </span>
        </div>

        {/* 分段式 LED 音量條 */}
        <div className="relative h-2 w-full bg-elevated border border-border-dim overflow-hidden">
          {/* 填充條 */}
          <div
            className={`absolute inset-y-0 left-0 transition-[width] duration-75 ${meterColor}`}
            style={{ width: `${meterPct}%` }}
          />
          {/* 分段線（LED 效果） */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(to right, transparent, transparent 3px, #1A1D24 3px, #1A1D24 4px)`,
            }}
          />
          {/* 色區參考線：-18 dBFS */}
          <div
            className="absolute inset-y-0 w-px bg-border-dim"
            style={{ left: `${dbfsToPercent(YELLOW_THRESHOLD)}%` }}
          />
          {/* 色區參考線：-6 dBFS */}
          <div
            className="absolute inset-y-0 w-px bg-border-dim"
            style={{ left: `${dbfsToPercent(RED_THRESHOLD)}%` }}
          />
        </div>

        {/* dBFS 刻度 */}
        <div className="flex justify-between text-[8px] font-mono text-[#3A3D45]">
          <span>-48</span>
          <span className="text-[#4A4D55]">-24</span>
          <span className="text-amber-900/80">-12</span>
          <span className="text-red-900/80">-6</span>
          <span className="text-red-900">0</span>
        </div>
      </div>
    </div>
  );
}
