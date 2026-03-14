"use client";

/**
 * useAiTracking — 管理 TrackingEngine 生命週期的 React Hook
 *
 * 負責：建立/銷毀 TrackingEngine、連接 store、提供 onManualOverride 回呼
 */

import { useRef, useCallback, useEffect } from "react";
import { useLyricsStore } from "@/lib/store";
import { TrackingEngine } from "@/lib/ai-tracking/tracking-engine";
import { AudioCapture } from "@/lib/audio/audio-capture";
import { DeepgramProvider } from "@/lib/stt/deepgram-provider";

export function useAiTracking() {
  const engineRef = useRef<TrackingEngine | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const volumeRafRef = useRef<number | null>(null);

  const startAiTracking = useLyricsStore((s) => s.startAiTracking);
  const stopAiTracking = useLyricsStore((s) => s.stopAiTracking);
  const updateAiStatus = useLyricsStore((s) => s.updateAiStatus);
  const updateAudioInput = useLyricsStore((s) => s.updateAudioInput);
  const updateAiTranscript = useLyricsStore((s) => s.updateAiTranscript);
  const triggerManualOverride = useLyricsStore((s) => s.triggerManualOverride);
  const audioInput = useLyricsStore((s) => s.audioInput);

  // 音量輪詢：用 requestAnimationFrame 定期更新 store 的 volume
  const startVolumePolling = useCallback(() => {
    const poll = () => {
      if (audioCaptureRef.current?.isCapturing()) {
        const volume = audioCaptureRef.current.getVolume();
        updateAudioInput({ volume });
      }
      volumeRafRef.current = requestAnimationFrame(poll);
    };
    volumeRafRef.current = requestAnimationFrame(poll);
  }, [updateAudioInput]);

  const stopVolumePolling = useCallback(() => {
    if (volumeRafRef.current !== null) {
      cancelAnimationFrame(volumeRafRef.current);
      volumeRafRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    try {
      const store = useLyricsStore.getState();
      const settings = store.aiSettings;

      // 取得 API key：優先使用者自行輸入，其次環境變數，最後從後端取得
      let apiKey = settings.apiKey ?? process.env["NEXT_PUBLIC_DEEPGRAM_API_KEY"] ?? null;
      if (!apiKey) {
        const resp = await fetch("/api/stt/token");
        if (!resp.ok) {
          updateAiStatus("error", undefined, undefined, "無法取得 STT API 金鑰");
          return;
        }
        const data = await resp.json() as { token: string };
        apiKey = data.token;
      }

      const audioCapture = new AudioCapture();
      audioCaptureRef.current = audioCapture;

      const sttProvider = new DeepgramProvider();

      const engine = new TrackingEngine({
        sttProvider,
        audioCapture,
        jumpToLine: useLyricsStore.getState().jumpToLine,
        getCurrentIndex: () => useLyricsStore.getState().currentIndex,
        getLyrics: () => useLyricsStore.getState().lyrics,
        getLrcTimestamps: () => useLyricsStore.getState().currentSong?.lrcTimestamps,
        onError: (error) => {
          updateAiStatus("error", undefined, undefined, error.message);
        },
        onTranscript: (text, isFinal) => {
          updateAiTranscript(text, isFinal);
        },
        matchConfig: {
          confidenceThreshold: settings.confidenceThreshold,
          windowBefore: settings.windowBefore,
          windowAfter: settings.windowAfter,
          fullScanThreshold: settings.fullScanThreshold,
        },
        cooldownMs: settings.manualOverrideCooldown,
      });

      engineRef.current = engine;

      await engine.start(
        { language: "zh-TW", sampleRate: 16000, apiKey: apiKey! },
        store.audioInput.deviceId ?? undefined,
        store.audioInput.gain
      );

      startAiTracking();
      updateAudioInput({ isCapturing: true });
      startVolumePolling();
    } catch (error) {
      const message = error instanceof Error ? error.message : "啟動 AI 追蹤失敗";
      updateAiStatus("error", undefined, undefined, message);
    }
  }, [startAiTracking, updateAiStatus, updateAudioInput, startVolumePolling]);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    audioCaptureRef.current = null;
    stopVolumePolling();
    stopAiTracking();
    updateAudioInput({ isCapturing: false, volume: 0 });
  }, [stopAiTracking, updateAudioInput, stopVolumePolling]);

  // 手動介入：同時通知 store 和 TrackingEngine
  const onManualOverride = useCallback(() => {
    triggerManualOverride();
    engineRef.current?.onManualOverride();
  }, [triggerManualOverride]);

  // WebSocket echo-back 判斷
  const shouldIgnoreLineChange = useCallback((lineIndex: number) => {
    return engineRef.current?.shouldIgnoreLineChange(lineIndex) ?? false;
  }, []);

  // Gain 即時同步
  useEffect(() => {
    audioCaptureRef.current?.setGain(audioInput.gain);
  }, [audioInput.gain]);

  // 清理
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      stopVolumePolling();
    };
  }, [stopVolumePolling]);

  return { start, stop, onManualOverride, shouldIgnoreLineChange };
}
