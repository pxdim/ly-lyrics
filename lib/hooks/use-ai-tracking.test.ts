/**
 * useAiTracking Hook 測試
 *
 * 驗證 TrackingEngine 生命週期管理、store 整合、
 * controlMode 封鎖、gain 同步、cleanup 等核心行為。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

// mock TrackingEngine class
const mockEngineStart = vi.fn().mockResolvedValue(undefined);
const mockEngineStop = vi.fn();
const mockEngineOnManualOverride = vi.fn();
const mockEngineShouldIgnoreLineChange = vi.fn().mockReturnValue(false);

vi.mock("@/lib/ai-tracking/tracking-engine", () => ({
  TrackingEngine: vi.fn().mockImplementation(function () {
    return {
      start: mockEngineStart,
      stop: mockEngineStop,
      onManualOverride: mockEngineOnManualOverride,
      shouldIgnoreLineChange: mockEngineShouldIgnoreLineChange,
    };
  }),
}));

// mock AudioCapture class
const mockAudioCaptureSetGain = vi.fn();
const mockAudioCaptureIsCapturing = vi.fn().mockReturnValue(false);
const mockAudioCaptureGetVolume = vi.fn().mockReturnValue(0);

vi.mock("@/lib/audio/audio-capture", () => ({
  AudioCapture: vi.fn().mockImplementation(function () {
    return {
      setGain: mockAudioCaptureSetGain,
      isCapturing: mockAudioCaptureIsCapturing,
      getVolume: mockAudioCaptureGetVolume,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      onAudioData: vi.fn(),
      getSampleRate: vi.fn().mockReturnValue(48000),
    };
  }),
}));

// mock STT providers
vi.mock("@/lib/stt/deepgram-provider", () => ({
  DeepgramProvider: vi.fn().mockImplementation(function () {
    return {
      name: "deepgram",
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      sendAudio: vi.fn(),
      onTranscript: vi.fn(),
      onError: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
    };
  }),
}));

vi.mock("@/lib/stt/web-speech-provider", () => ({
  WebSpeechProvider: vi.fn().mockImplementation(function () {
    return {
      name: "web-speech",
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      sendAudio: vi.fn(),
      onTranscript: vi.fn(),
      onError: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
    };
  }),
}));

vi.mock("@/lib/stt/google-cloud-provider", () => ({
  GoogleCloudProvider: vi.fn().mockImplementation(function () {
    return {
      name: "google-cloud",
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      sendAudio: vi.fn(),
      onTranscript: vi.fn(),
      onError: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
    };
  }),
}));

import { useLyricsStore } from "@/lib/store";
import { useAiTracking } from "./use-ai-tracking";
import { TrackingEngine } from "@/lib/ai-tracking/tracking-engine";

// ============================================================================
// 測試
// ============================================================================

describe("useAiTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重設 store 為初始狀態
    useLyricsStore.setState({
      controlMode: "auto",
      lyrics: ["第一行", "第二行", "第三行"],
      currentIndex: 0,
      audioInput: { deviceId: null, gain: 0, volume: 0, isCapturing: false },
      aiSettings: {
        sttProvider: "google-cloud",
        apiKey: null,
        confidenceThreshold: 0.45,
        windowBefore: 2,
        windowAfter: 5,
        manualOverrideCooldown: 5000,
        fullScanThreshold: 0.7,
      },
    });
    // mock requestAnimationFrame / cancelAnimationFrame（不使用 fake timers）
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((_cb) => {
      // 不實際執行 callback，只回傳一個 id
      return 999;
    });
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {
      // no-op
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 初始 return 值
  // ============================================================================

  describe("initial return values", () => {
    it("returns start, stop, onManualOverride, shouldIgnoreLineChange functions", () => {
      const { result } = renderHook(() => useAiTracking());

      expect(typeof result.current.start).toBe("function");
      expect(typeof result.current.stop).toBe("function");
      expect(typeof result.current.onManualOverride).toBe("function");
      expect(typeof result.current.shouldIgnoreLineChange).toBe("function");
    });
  });

  // ============================================================================
  // startTracking
  // ============================================================================

  describe("start", () => {
    it("creates TrackingEngine and calls engine.start", async () => {
      const { result } = renderHook(() => useAiTracking());

      await act(async () => {
        await result.current.start();
      });

      expect(TrackingEngine).toHaveBeenCalledTimes(1);
      expect(mockEngineStart).toHaveBeenCalledTimes(1);
    });

    it("calls startAiTracking and updateAudioInput on success", async () => {
      const startAiTracking = vi.fn();
      const updateAudioInput = vi.fn();
      useLyricsStore.setState({ startAiTracking, updateAudioInput });

      const { result } = renderHook(() => useAiTracking());

      await act(async () => {
        await result.current.start();
      });

      expect(startAiTracking).toHaveBeenCalled();
      expect(updateAudioInput).toHaveBeenCalledWith({ isCapturing: true });
    });

    it("calls updateAiStatus with error when engine.start fails", async () => {
      mockEngineStart.mockRejectedValueOnce(new Error("mic denied"));

      const updateAiStatus = vi.fn();
      useLyricsStore.setState({ updateAiStatus });

      const { result } = renderHook(() => useAiTracking());

      await act(async () => {
        await result.current.start();
      });

      expect(updateAiStatus).toHaveBeenCalledWith(
        "error",
        undefined,
        undefined,
        "mic denied"
      );
    });

    it("fetches API token for deepgram provider when no apiKey configured", async () => {
      useLyricsStore.setState({
        aiSettings: {
          sttProvider: "deepgram",
          apiKey: null,
          confidenceThreshold: 0.45,
          windowBefore: 2,
          windowAfter: 5,
          manualOverrideCooldown: 5000,
          fullScanThreshold: 0.7,
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { result } = renderHook(() => useAiTracking());

      await act(async () => {
        await result.current.start();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/stt/token");

      vi.unstubAllGlobals();
    });

    it("sets error status when deepgram token fetch fails", async () => {
      useLyricsStore.setState({
        aiSettings: {
          sttProvider: "deepgram",
          apiKey: null,
          confidenceThreshold: 0.45,
          windowBefore: 2,
          windowAfter: 5,
          manualOverrideCooldown: 5000,
          fullScanThreshold: 0.7,
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({ ok: false });
      vi.stubGlobal("fetch", mockFetch);

      const updateAiStatus = vi.fn();
      useLyricsStore.setState({ updateAiStatus });

      const { result } = renderHook(() => useAiTracking());

      await act(async () => {
        await result.current.start();
      });

      expect(updateAiStatus).toHaveBeenCalledWith(
        "error",
        undefined,
        undefined,
        "無法取得 STT API 金鑰，請確認已登入"
      );
      // 不應建立 engine
      expect(TrackingEngine).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  // ============================================================================
  // stopTracking
  // ============================================================================

  describe("stop", () => {
    it("calls engine.stop and resets audio state", async () => {
      const stopAiTracking = vi.fn();
      const updateAudioInput = vi.fn();
      useLyricsStore.setState({ stopAiTracking, updateAudioInput });

      const { result } = renderHook(() => useAiTracking());

      // 先 start 建立 engine
      await act(async () => {
        await result.current.start();
      });

      act(() => {
        result.current.stop();
      });

      expect(mockEngineStop).toHaveBeenCalled();
      expect(stopAiTracking).toHaveBeenCalled();
      expect(updateAudioInput).toHaveBeenCalledWith({ isCapturing: false, volume: 0 });
    });

    it("handles stop when engine is not started (no-op)", () => {
      const { result } = renderHook(() => useAiTracking());

      // 不應拋出錯誤
      expect(() => {
        act(() => {
          result.current.stop();
        });
      }).not.toThrow();
    });
  });

  // ============================================================================
  // gain 變更同步
  // ============================================================================

  describe("gain synchronization", () => {
    it("calls audioCapture.setGain when audioInput.gain changes", async () => {
      const { result } = renderHook(() => useAiTracking());

      // start 以建立 audioCaptureRef
      await act(async () => {
        await result.current.start();
      });

      // 變更 gain
      act(() => {
        useLyricsStore.setState({
          audioInput: { deviceId: null, gain: 10, volume: 0, isCapturing: true },
        });
      });

      expect(mockAudioCaptureSetGain).toHaveBeenCalledWith(10);
    });
  });

  // ============================================================================
  // controlMode 對 jumpToLine 的封鎖效果
  // ============================================================================

  describe("controlMode blocking", () => {
    it("passes jumpToLine callback that respects manual mode", async () => {
      const jumpToLine = vi.fn();
      useLyricsStore.setState({ controlMode: "manual", jumpToLine });

      const { result } = renderHook(() => useAiTracking());

      await act(async () => {
        await result.current.start();
      });

      // 取得傳入 TrackingEngine 的 config
      const engineConfig = vi.mocked(TrackingEngine).mock.calls[0]?.[0];
      expect(engineConfig).toBeDefined();

      // 呼叫 jumpToLine — 因為 controlMode 是 manual，應該被封鎖
      engineConfig!.jumpToLine(2);
      expect(jumpToLine).not.toHaveBeenCalled();
    });

    it("allows jumpToLine when controlMode is auto", async () => {
      const jumpToLine = vi.fn();
      useLyricsStore.setState({ controlMode: "auto", jumpToLine });

      const { result } = renderHook(() => useAiTracking());

      await act(async () => {
        await result.current.start();
      });

      const engineConfig = vi.mocked(TrackingEngine).mock.calls[0]?.[0];
      expect(engineConfig).toBeDefined();
      engineConfig!.jumpToLine(2);
      expect(jumpToLine).toHaveBeenCalledWith(2);
    });
  });

  // ============================================================================
  // onManualOverride
  // ============================================================================

  describe("onManualOverride", () => {
    it("calls triggerManualOverride on store and engine.onManualOverride", async () => {
      const triggerManualOverride = vi.fn();
      useLyricsStore.setState({ triggerManualOverride });

      const { result } = renderHook(() => useAiTracking());

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        result.current.onManualOverride();
      });

      expect(triggerManualOverride).toHaveBeenCalled();
      expect(mockEngineOnManualOverride).toHaveBeenCalled();
    });

    it("calls triggerManualOverride even when engine is not started", () => {
      const triggerManualOverride = vi.fn();
      useLyricsStore.setState({ triggerManualOverride });

      const { result } = renderHook(() => useAiTracking());

      act(() => {
        result.current.onManualOverride();
      });

      // store 的 triggerManualOverride 應仍被呼叫
      expect(triggerManualOverride).toHaveBeenCalled();
      // engine 的不應被呼叫（engine 不存在）
      expect(mockEngineOnManualOverride).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // shouldIgnoreLineChange
  // ============================================================================

  describe("shouldIgnoreLineChange", () => {
    it("delegates to engine.shouldIgnoreLineChange when engine exists", async () => {
      mockEngineShouldIgnoreLineChange.mockReturnValue(true);

      const { result } = renderHook(() => useAiTracking());

      await act(async () => {
        await result.current.start();
      });

      const shouldIgnore = result.current.shouldIgnoreLineChange(3);
      expect(shouldIgnore).toBe(true);
      expect(mockEngineShouldIgnoreLineChange).toHaveBeenCalledWith(3);
    });

    it("returns false when engine is not started", () => {
      const { result } = renderHook(() => useAiTracking());

      const shouldIgnore = result.current.shouldIgnoreLineChange(1);
      expect(shouldIgnore).toBe(false);
    });
  });

  // ============================================================================
  // cleanup on unmount
  // ============================================================================

  describe("cleanup on unmount", () => {
    it("calls engine.stop and stops volume polling on unmount", async () => {
      const { result, unmount } = renderHook(() => useAiTracking());

      await act(async () => {
        await result.current.start();
      });

      // 重設呼叫紀錄以確認 unmount 時再次呼叫
      mockEngineStop.mockClear();

      unmount();

      expect(mockEngineStop).toHaveBeenCalled();
    });

    it("does not throw on unmount when engine is not started", () => {
      const { unmount } = renderHook(() => useAiTracking());

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});
