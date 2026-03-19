/**
 * AI Tracking Slice — AI 追蹤狀態、音訊輸入、AI 設定
 *
 * 負責管理 AI 聽歌追蹤功能的啟停、狀態更新、
 * 手動覆蓋冷卻、音訊輸入裝置與 AI 引擎設定。
 */

import type {
  AiTrackingSliceState,
  AiTrackingSliceActions,
  SliceCreator,
} from "./types";

type AiTrackingSlice = AiTrackingSliceState & AiTrackingSliceActions;

export const createAiTrackingSlice: SliceCreator<AiTrackingSlice> = (set, get) => ({
  // 初始狀態
  aiTracking: {
    isActive: false,
    status: "idle" as const,
    confidence: 0,
    lastMatchedLine: null,
    cooldownUntil: null,
    sttProvider: "google-cloud" as const,
    errorMessage: null,
    lastTranscript: null,
    lastTranscriptFinal: false,
  },
  aiSettings: {
    sttProvider: "google-cloud" as const,
    apiKey: null,
    confidenceThreshold: 0.45,
    windowBefore: 2,
    windowAfter: 5,
    manualOverrideCooldown: 5000,
    fullScanThreshold: 0.7,
  },
  audioInput: {
    deviceId: null,
    gain: 0,
    volume: 0,
    isCapturing: false,
  },

  // AI 追蹤操作
  startAiTracking: () => {
    set({
      aiTracking: {
        ...get().aiTracking,
        isActive: true,
        status: "listening",
        errorMessage: null,
        lastTranscript: null,
        lastTranscriptFinal: false,
      },
    });
  },

  stopAiTracking: () => {
    set({
      aiTracking: {
        isActive: false,
        status: "idle",
        confidence: 0,
        lastMatchedLine: null,
        cooldownUntil: null,
        sttProvider: get().aiSettings.sttProvider,
        errorMessage: null,
        lastTranscript: null,
        lastTranscriptFinal: false,
      },
    });
  },

  updateAiStatus: (status, confidence, matchedLine, errorMessage) => {
    set({
      aiTracking: {
        ...get().aiTracking,
        status,
        ...(confidence !== undefined && { confidence }),
        ...(matchedLine !== undefined && { lastMatchedLine: matchedLine }),
        ...(errorMessage !== undefined && { errorMessage }),
      },
    });
  },

  updateAiTranscript: (text, isFinal) => {
    set({
      aiTracking: {
        ...get().aiTracking,
        lastTranscript: text,
        lastTranscriptFinal: isFinal,
      },
    });
  },

  triggerManualOverride: () => {
    const cooldown = get().aiSettings.manualOverrideCooldown;
    set({
      aiTracking: {
        ...get().aiTracking,
        status: "cooldown",
        cooldownUntil: Date.now() + cooldown,
      },
    });
    // 冷卻結束後自動恢復監聽狀態
    setTimeout(() => {
      const current = get().aiTracking;
      if (current.isActive && current.status === "cooldown") {
        set({
          aiTracking: {
            ...get().aiTracking,
            status: "listening",
            cooldownUntil: null,
          },
        });
      }
    }, cooldown);
  },

  updateAudioInput: (partial) => {
    set({
      audioInput: { ...get().audioInput, ...partial },
    });
  },

  updateAiSettings: (partial) => {
    set({
      aiSettings: { ...get().aiSettings, ...partial },
    });
  },
});
