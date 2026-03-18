import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSpeechProvider } from "./web-speech-provider";
import type { STTConfig } from "./types";

// Mock SpeechRecognition 實例型別
interface MockRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  onresult: ((event: {
    resultIndex: number;
    results: {
      length: number;
      [index: number]: {
        isFinal: boolean;
        length: number;
        [index: number]: { transcript: string; confidence: number };
      };
    };
  }) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

let mockRecognitionInstance: MockRecognitionInstance;

function createMockRecognition(): MockRecognitionInstance {
  return {
    continuous: false,
    interimResults: false,
    lang: "",
    maxAlternatives: 1,
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    onresult: null,
    onerror: null,
    onend: null,
    onstart: null,
  };
}

const testConfig: STTConfig = {
  language: "zh-TW",
  sampleRate: 16000,
  apiKey: "",
};

/**
 * 建立可用 new 呼叫的 Mock SpeechRecognition 建構子
 * 使用 function 宣告（非箭頭函式），確保 vi.fn 產出可作為 constructor
 */
function createMockConstructor() {
  return vi.fn(function MockSpeechRecognitionCtor(this: MockRecognitionInstance) {
    mockRecognitionInstance = createMockRecognition();
    // start() 呼叫時自動觸發 onstart，模擬瀏覽器行為
    mockRecognitionInstance.start.mockImplementation(() => {
      queueMicrotask(() => {
        mockRecognitionInstance.onstart?.();
      });
    });
    Object.assign(this, mockRecognitionInstance);
    // 保持引用同步：讓外部透過 mockRecognitionInstance 操作同一物件
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockRecognitionInstance = this;
  });
}

describe("WebSpeechProvider", () => {
  let provider: WebSpeechProvider;
  let MockSpeechRecognition: ReturnType<typeof createMockConstructor>;

  beforeEach(() => {
    vi.clearAllMocks();

    MockSpeechRecognition = createMockConstructor();

    // 模擬瀏覽器 window 上的 webkitSpeechRecognition
    Object.defineProperty(globalThis, "window", {
      value: {
        SpeechRecognition: undefined,
        webkitSpeechRecognition: MockSpeechRecognition,
      },
      writable: true,
      configurable: true,
    });

    provider = new WebSpeechProvider();
  });

  afterEach(() => {
    // 還原 window
    delete (globalThis as Record<string, unknown>)["window"];
  });

  // --- 建構子 ---
  it("has name 'web-speech'", () => {
    expect(provider.name).toBe("web-speech");
  });

  it("isConnected returns false before connect", () => {
    expect(provider.isConnected()).toBe(false);
  });

  // --- connect() ---
  it("connect creates SpeechRecognition with correct settings", async () => {
    await provider.connect(testConfig);

    expect(mockRecognitionInstance.continuous).toBe(true);
    expect(mockRecognitionInstance.interimResults).toBe(true);
    expect(mockRecognitionInstance.lang).toBe("zh-TW");
    expect(mockRecognitionInstance.maxAlternatives).toBe(1);
  });

  it("connect calls recognition.start()", async () => {
    await provider.connect(testConfig);

    expect(mockRecognitionInstance.start).toHaveBeenCalledTimes(1);
  });

  it("connect resolves when onstart fires", async () => {
    const connectPromise = provider.connect(testConfig);

    await expect(connectPromise).resolves.toBeUndefined();
    expect(provider.isConnected()).toBe(true);
  });

  it("connect uses window.SpeechRecognition when available", async () => {
    const MockStandard = createMockConstructor();

    Object.defineProperty(globalThis, "window", {
      value: {
        SpeechRecognition: MockStandard,
        webkitSpeechRecognition: undefined,
      },
      writable: true,
      configurable: true,
    });

    const p = new WebSpeechProvider();
    await p.connect(testConfig);

    expect(MockStandard).toHaveBeenCalled();
    expect(p.isConnected()).toBe(true);
  });

  it("connect throws when browser does not support Speech API", async () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        SpeechRecognition: undefined,
        webkitSpeechRecognition: undefined,
      },
      writable: true,
      configurable: true,
    });

    const p = new WebSpeechProvider();
    await expect(p.connect(testConfig)).rejects.toThrow(
      "此瀏覽器不支援 Web Speech API，請使用 Chrome 或 Edge"
    );
  });

  // --- 接收辨識結果 ---
  it("onTranscript callback receives final result", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    await provider.connect(testConfig);

    mockRecognitionInstance.onresult?.({
      resultIndex: 0,
      results: {
        length: 1,
        0: {
          isFinal: true,
          length: 1,
          0: { transcript: "奇異恩典", confidence: 0.92 },
        },
      },
    });

    expect(callback).toHaveBeenCalledWith("奇異恩典", true);
  });

  it("onTranscript callback receives interim result", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    await provider.connect(testConfig);

    mockRecognitionInstance.onresult?.({
      resultIndex: 0,
      results: {
        length: 1,
        0: {
          isFinal: false,
          length: 1,
          0: { transcript: "奇異", confidence: 0.7 },
        },
      },
    });

    expect(callback).toHaveBeenCalledWith("奇異", false);
  });

  it("onTranscript handles multiple results from resultIndex", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    await provider.connect(testConfig);

    mockRecognitionInstance.onresult?.({
      resultIndex: 1,
      results: {
        length: 3,
        0: {
          isFinal: true,
          length: 1,
          0: { transcript: "第一段", confidence: 0.9 },
        },
        1: {
          isFinal: true,
          length: 1,
          0: { transcript: "第二段", confidence: 0.9 },
        },
        2: {
          isFinal: false,
          length: 1,
          0: { transcript: "第三段", confidence: 0.8 },
        },
      },
    });

    // 只處理從 resultIndex (1) 開始的結果
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith("第二段", true);
    expect(callback).toHaveBeenCalledWith("第三段", false);
  });

  it("does not call transcript callback when transcript is empty", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    await provider.connect(testConfig);

    mockRecognitionInstance.onresult?.({
      resultIndex: 0,
      results: {
        length: 1,
        0: {
          isFinal: true,
          length: 1,
          0: { transcript: "", confidence: 0 },
        },
      },
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not throw when no transcript callback is registered", async () => {
    await provider.connect(testConfig);

    expect(() => {
      mockRecognitionInstance.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            length: 1,
            0: { transcript: "測試", confidence: 0.9 },
          },
        },
      });
    }).not.toThrow();
  });

  // --- 錯誤處理 ---
  it("onError callback fires on recognition error", async () => {
    const errorCb = vi.fn();
    provider.onError(errorCb);

    await provider.connect(testConfig);

    mockRecognitionInstance.onerror?.({ error: "network" });

    expect(errorCb).toHaveBeenCalledTimes(1);
    const error = errorCb.mock.calls[0]![0] as Error;
    expect(error.message).toContain("語音辨識錯誤");
    expect(error.message).toContain("network");
  });

  it("ignores 'no-speech' error", async () => {
    const errorCb = vi.fn();
    provider.onError(errorCb);

    await provider.connect(testConfig);

    mockRecognitionInstance.onerror?.({ error: "no-speech" });

    expect(errorCb).not.toHaveBeenCalled();
  });

  it("ignores 'aborted' error", async () => {
    const errorCb = vi.fn();
    provider.onError(errorCb);

    await provider.connect(testConfig);

    mockRecognitionInstance.onerror?.({ error: "aborted" });

    expect(errorCb).not.toHaveBeenCalled();
  });

  it("does not throw on error when no error callback registered", async () => {
    await provider.connect(testConfig);

    expect(() => {
      mockRecognitionInstance.onerror?.({ error: "network" });
    }).not.toThrow();
  });

  // --- 自動重啟邏輯 ---
  it("auto-restarts recognition on onend when connected", async () => {
    await provider.connect(testConfig);

    // start 在 connect 時被呼叫一次
    expect(mockRecognitionInstance.start).toHaveBeenCalledTimes(1);

    // 模擬 onend（靜音過久自動停止）
    mockRecognitionInstance.onend?.();

    // 應自動重啟
    expect(mockRecognitionInstance.start).toHaveBeenCalledTimes(2);
  });

  it("does not auto-restart after disconnect", async () => {
    await provider.connect(testConfig);
    const capturedRecognition = mockRecognitionInstance;

    provider.disconnect();

    // disconnect 後 onend 已設為 null，確認 stop 已被呼叫
    expect(capturedRecognition.stop).toHaveBeenCalledTimes(1);
    expect(provider.isConnected()).toBe(false);
  });

  it("swallows error if restart fails during onend", async () => {
    await provider.connect(testConfig);

    // 模擬重啟時拋錯（可能在停止過程中重啟）
    mockRecognitionInstance.start.mockImplementation(() => {
      throw new Error("recognition already started");
    });

    // onend 觸發時重啟失敗不應拋錯
    expect(() => {
      mockRecognitionInstance.onend?.();
    }).not.toThrow();
  });

  // --- sendAudio (no-op) ---
  it("sendAudio is a no-op", async () => {
    await provider.connect(testConfig);

    // Web Speech API 自行管理麥克風，sendAudio 不應有副作用
    expect(() => {
      provider.sendAudio(new Float32Array([0.1, -0.2, 0.3]));
    }).not.toThrow();
  });

  // --- disconnect() 清理 ---
  it("disconnect clears all handlers and stops recognition", async () => {
    await provider.connect(testConfig);

    provider.disconnect();

    expect(mockRecognitionInstance.onend).toBeNull();
    expect(mockRecognitionInstance.onresult).toBeNull();
    expect(mockRecognitionInstance.onerror).toBeNull();
    expect(mockRecognitionInstance.stop).toHaveBeenCalled();
    expect(provider.isConnected()).toBe(false);
  });

  it("disconnect is safe to call when not connected", () => {
    expect(() => provider.disconnect()).not.toThrow();
    expect(provider.isConnected()).toBe(false);
  });

  it("disconnect is safe to call multiple times", async () => {
    await provider.connect(testConfig);

    expect(() => {
      provider.disconnect();
      provider.disconnect();
    }).not.toThrow();
  });
});
