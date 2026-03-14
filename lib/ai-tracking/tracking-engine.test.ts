import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TrackingEngine } from "./tracking-engine";
import type { STTProvider } from "../stt/types";
import type { AudioCapture } from "../audio/audio-capture";

// Mock STT Provider
function createMockSTTProvider(): STTProvider & {
  _triggerTranscript: (text: string, isFinal: boolean) => void;
  _triggerError: (error: Error) => void;
} {
  let transcriptCb: ((text: string, isFinal: boolean) => void) | null = null;
  let errorCb: ((error: Error) => void) | null = null;

  return {
    name: "mock-stt",
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    sendAudio: vi.fn(),
    onTranscript: (cb) => { transcriptCb = cb; },
    onError: (cb) => { errorCb = cb; },
    isConnected: vi.fn().mockReturnValue(true),
    _triggerTranscript: (text, isFinal) => transcriptCb?.(text, isFinal),
    _triggerError: (error) => errorCb?.(error),
  };
}

// Mock AudioCapture
function createMockAudioCapture(): AudioCapture {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    setGain: vi.fn(),
    getVolume: vi.fn().mockReturnValue(0.5),
    getOutputStream: vi.fn().mockReturnValue(new MediaStream()),
    onAudioData: vi.fn(),
    isCapturing: vi.fn().mockReturnValue(true),
  } as unknown as AudioCapture;
}

// Mock store
const mockJumpToLine = vi.fn();
const mockStore = {
  jumpToLine: mockJumpToLine,
  getCurrentIndex: vi.fn().mockReturnValue(0),
  getLyrics: vi.fn().mockReturnValue([
    "我走在回家的路上",
    "天空下起了小雨",
    "想起了你的笑容",
  ]),
  getLrcTimestamps: vi.fn().mockReturnValue(undefined),
};

// jsdom 環境下 MediaStream 未定義，需要 stub
vi.stubGlobal("MediaStream", class MediaStream {});

describe("TrackingEngine", () => {
  let engine: TrackingEngine;
  let sttProvider: ReturnType<typeof createMockSTTProvider>;
  let audioCapture: ReturnType<typeof createMockAudioCapture>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sttProvider = createMockSTTProvider();
    audioCapture = createMockAudioCapture();
    engine = new TrackingEngine({
      sttProvider,
      audioCapture,
      jumpToLine: mockJumpToLine,
      getCurrentIndex: mockStore.getCurrentIndex,
      getLyrics: mockStore.getLyrics,
      getLrcTimestamps: mockStore.getLrcTimestamps,
    });
  });

  afterEach(() => {
    engine.stop();
    vi.useRealTimers();
  });

  it("start initializes audio capture and STT provider", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    expect(audioCapture.start).toHaveBeenCalled();
    expect(sttProvider.connect).toHaveBeenCalled();
    expect(engine.isActive()).toBe(true);
  });

  it("stop cleans up all resources", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    engine.stop();
    expect(audioCapture.stop).toHaveBeenCalled();
    expect(sttProvider.disconnect).toHaveBeenCalled();
    expect(engine.isActive()).toBe(false);
  });

  it("calls jumpToLine when STT matches lyrics (final result)", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    sttProvider._triggerTranscript("天空下起了小雨", true);
    expect(mockJumpToLine).toHaveBeenCalledWith(1);
  });

  it("does NOT call jumpToLine for low confidence matches", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    sttProvider._triggerTranscript("完全無關的文字", true);
    expect(mockJumpToLine).not.toHaveBeenCalled();
  });

  it("does NOT call jumpToLine during cooldown", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    engine.onManualOverride();
    sttProvider._triggerTranscript("天空下起了小雨", true);
    expect(mockJumpToLine).not.toHaveBeenCalled();
  });

  it("resumes matching after cooldown expires", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    engine.onManualOverride();
    vi.advanceTimersByTime(5100);
    sttProvider._triggerTranscript("天空下起了小雨", true);
    expect(mockJumpToLine).toHaveBeenCalledWith(1);
  });

  it("_lastAiLineIndex prevents self-echo cooldown", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    sttProvider._triggerTranscript("天空下起了小雨", true);
    expect(mockJumpToLine).toHaveBeenCalledWith(1);

    const isCooldown = engine.shouldIgnoreLineChange(1);
    expect(isCooldown).toBe(true);

    const isExternal = engine.shouldIgnoreLineChange(2);
    expect(isExternal).toBe(false);
  });

  it("ignores interim results (only final triggers jumpToLine)", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    sttProvider._triggerTranscript("天空下起了", false); // interim
    expect(mockJumpToLine).not.toHaveBeenCalled();

    sttProvider._triggerTranscript("天空下起了小雨", true); // final
    expect(mockJumpToLine).toHaveBeenCalledWith(1);
  });
});
