/**
 * AI Tracking Slice 單元測試
 *
 * 測試 AI 追蹤狀態管理、音訊輸入、AI 設定。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock WebSocket
vi.mock("@/lib/websocket/native-client", () => ({
  initNativeWSClient: () => ({
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(() => false),
  }),
}));

import { createAiTrackingSlice } from "./ai-tracking-slice";
import type { LyricsStore } from "./types";

describe("createAiTrackingSlice", () => {
  let state: ReturnType<typeof createAiTrackingSlice>;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let storeState: Partial<LyricsStore>;

  beforeEach(() => {
    vi.clearAllMocks();

    storeState = {
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
    };

    mockSet = vi.fn((partial) => {
      Object.assign(storeState, partial);
    });

    mockGet = vi.fn(() => storeState as LyricsStore);

    state = createAiTrackingSlice(
      mockSet as unknown as Parameters<typeof createAiTrackingSlice>[0],
      mockGet as unknown as Parameters<typeof createAiTrackingSlice>[1],
      {} as Parameters<typeof createAiTrackingSlice>[2],
    );
  });

  it("應提供正確的初始狀態", () => {
    expect(state.aiTracking.isActive).toBe(false);
    expect(state.aiTracking.status).toBe("idle");
    expect(state.aiSettings.sttProvider).toBe("google-cloud");
    expect(state.audioInput.deviceId).toBeNull();
  });

  it("startAiTracking 應啟動追蹤", () => {
    state.startAiTracking();

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        aiTracking: expect.objectContaining({
          isActive: true,
          status: "listening",
        }),
      }),
    );
  });

  it("stopAiTracking 應重置追蹤狀態", () => {
    state.stopAiTracking();

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        aiTracking: expect.objectContaining({
          isActive: false,
          status: "idle",
        }),
      }),
    );
  });

  it("updateAudioInput 應局部更新音訊輸入", () => {
    state.updateAudioInput({ gain: 10 });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        audioInput: expect.objectContaining({ gain: 10 }),
      }),
    );
  });

  it("updateAiSettings 應局部更新 AI 設定", () => {
    state.updateAiSettings({ confidenceThreshold: 0.8 });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        aiSettings: expect.objectContaining({ confidenceThreshold: 0.8 }),
      }),
    );
  });
});
