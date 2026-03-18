import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GoogleCloudProvider } from "./google-cloud-provider";
import type { STTConfig } from "./types";

// Mock WebSocket — 模擬瀏覽器原生 WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  binaryType = "";
  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }

  simulateClose(code = 1006, reason = "") {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }

  simulateError() {
    this.onerror?.(new Event("error"));
  }
}

let mockWsInstance: MockWebSocket;

const MockWebSocketFactory = vi.fn(function MockWebSocketConstructor() {
  mockWsInstance = new MockWebSocket();
  return mockWsInstance;
}) as unknown as typeof WebSocket;

// 靜態常數必須與真實 WebSocket 一致
const factoryAsRecord = MockWebSocketFactory as unknown as Record<string, number>;
factoryAsRecord["CONNECTING"] = 0;
factoryAsRecord["OPEN"] = 1;
factoryAsRecord["CLOSING"] = 2;
factoryAsRecord["CLOSED"] = 3;

vi.stubGlobal("WebSocket", MockWebSocketFactory);

const testConfig: STTConfig = {
  language: "zh-TW",
  sampleRate: 16000,
  apiKey: "test-key",
};

describe("GoogleCloudProvider", () => {
  let provider: GoogleCloudProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GoogleCloudProvider();
  });

  afterEach(() => {
    // 清理環境變數
    delete process.env["NEXT_PUBLIC_GO_WS_URL"];
  });

  // --- 建構子初始化 ---
  it("has name 'google-cloud'", () => {
    expect(provider.name).toBe("google-cloud");
  });

  it("isConnected returns false before connect", () => {
    expect(provider.isConnected()).toBe(false);
  });

  // --- connect() ---
  it("connect creates WebSocket with correct URL using default base", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    // 預設 NEXT_PUBLIC_GO_WS_URL 為 ws://localhost:8080/ws
    // 移除 /ws 後加上 /api/stt/stream
    expect(MockWebSocketFactory).toHaveBeenCalledWith(
      "ws://localhost:8080/api/stt/stream?sampleRate=16000&language=zh-TW"
    );
  });

  it("connect uses NEXT_PUBLIC_GO_WS_URL to build URL", async () => {
    process.env["NEXT_PUBLIC_GO_WS_URL"] = "wss://example.com/ws";

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    expect(MockWebSocketFactory).toHaveBeenCalledWith(
      "wss://example.com/api/stt/stream?sampleRate=16000&language=zh-TW"
    );
  });

  it("connect sets binaryType to arraybuffer", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    expect(mockWsInstance.binaryType).toBe("arraybuffer");
  });

  it("connect resolves on WebSocket open", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();

    await expect(connectPromise).resolves.toBeUndefined();
    expect(provider.isConnected()).toBe(true);
  });

  it("connect rejects on WebSocket error", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateError();

    await expect(connectPromise).rejects.toThrow("Google STT WebSocket 連線失敗");
  });

  // --- 音訊資料發送 ---
  it("sendAudio converts Float32 to Int16 PCM and sends", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    const audioData = new Float32Array([0.5, -0.5, 1.0, -1.0, 0.0]);
    provider.sendAudio(audioData);

    expect(mockWsInstance.send).toHaveBeenCalledTimes(1);

    // 驗證發送的是 ArrayBuffer（Int16Array 的 buffer）
    const sentBuffer = mockWsInstance.send.mock.calls[0]![0] as ArrayBuffer;
    const int16View = new Int16Array(sentBuffer);
    expect(int16View.length).toBe(5);

    // 驗證 Float32 → Int16 轉換精確度
    // 0.5  → 0.5 * 0x7FFF = 16383
    expect(int16View[0]).toBe(16383);
    // -0.5 → -0.5 * 0x8000 = -16384
    expect(int16View[1]).toBe(-16384);
    // 1.0  → 1.0 * 0x7FFF = 32767
    expect(int16View[2]).toBe(32767);
    // -1.0 → -1.0 * 0x8000 = -32768
    expect(int16View[3]).toBe(-32768);
    // 0.0  → 0
    expect(int16View[4]).toBe(0);
  });

  it("sendAudio clamps values exceeding [-1, 1]", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    const audioData = new Float32Array([2.0, -3.0]);
    provider.sendAudio(audioData);

    const sentBuffer = mockWsInstance.send.mock.calls[0]![0] as ArrayBuffer;
    const int16View = new Int16Array(sentBuffer);
    // 2.0 clamped to 1.0 → 32767
    expect(int16View[0]).toBe(32767);
    // -3.0 clamped to -1.0 → -32768
    expect(int16View[1]).toBe(-32768);
  });

  it("sendAudio does nothing when not connected", () => {
    // provider 未呼叫 connect()，ws 為 null
    const audioData = new Float32Array([0.1, -0.2]);
    provider.sendAudio(audioData);

    // MockWebSocketFactory 不應被呼叫（因為沒有 connect）
    // 注意：beforeEach 的 clearAllMocks 已重置計數
    expect(MockWebSocketFactory).not.toHaveBeenCalled();
  });

  it("sendAudio does nothing when WebSocket is not OPEN", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    // 模擬 readyState 不是 OPEN
    mockWsInstance.readyState = MockWebSocket.CLOSING;
    const audioData = new Float32Array([0.1]);
    provider.sendAudio(audioData);

    expect(mockWsInstance.send).not.toHaveBeenCalled();
  });

  // --- 接收辨識結果 ---
  it("onTranscript callback receives parsed transcript", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    mockWsInstance.simulateMessage(
      JSON.stringify({ transcript: "耶穌愛你", isFinal: true, confidence: 0.95 })
    );

    expect(callback).toHaveBeenCalledWith("耶穌愛你", true);
  });

  it("onTranscript handles interim results with isFinal false", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    mockWsInstance.simulateMessage(
      JSON.stringify({ transcript: "耶穌", isFinal: false })
    );

    expect(callback).toHaveBeenCalledWith("耶穌", false);
  });

  it("onTranscript defaults isFinal to true when missing", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    // 回傳沒有 isFinal 欄位的訊息
    mockWsInstance.simulateMessage(
      JSON.stringify({ transcript: "哈利路亞" })
    );

    expect(callback).toHaveBeenCalledWith("哈利路亞", true);
  });

  it("ignores messages without transcript field", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    mockWsInstance.simulateMessage(
      JSON.stringify({ confidence: 0.9, isFinal: true })
    );

    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores non-JSON messages", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    // 發送非 JSON 訊息，不應拋錯
    mockWsInstance.simulateMessage("not json at all");

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call transcript callback if none registered", async () => {
    // 不註冊 callback，確保不會拋錯
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    expect(() => {
      mockWsInstance.simulateMessage(
        JSON.stringify({ transcript: "測試", isFinal: true })
      );
    }).not.toThrow();
  });

  // --- 斷線處理 ---
  it("fires error callback on unintentional close", async () => {
    const errorCb = vi.fn();
    provider.onError(errorCb);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    mockWsInstance.simulateClose(1006, "connection reset");

    expect(errorCb).toHaveBeenCalledTimes(1);
    const error = errorCb.mock.calls[0]![0] as Error;
    expect(error.message).toContain("Google STT 連線中斷");
    expect(error.message).toContain("code=1006");
    expect(error.message).toContain("reason=connection reset");
  });

  it("includes '無' when close reason is empty", async () => {
    const errorCb = vi.fn();
    provider.onError(errorCb);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    mockWsInstance.simulateClose(1006, "");

    const error = errorCb.mock.calls[0]![0] as Error;
    expect(error.message).toContain("reason=無");
  });

  it("does not fire error callback on intentional disconnect", async () => {
    const errorCb = vi.fn();
    provider.onError(errorCb);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    provider.disconnect();

    // 模擬 onclose 觸發（在 intentional close 之後）
    mockWsInstance.onclose?.({ code: 1000, reason: "" });

    expect(errorCb).not.toHaveBeenCalled();
  });

  it("does not fire error callback on close when no callback registered", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    // 不註冊 error callback，不應拋錯
    expect(() => {
      mockWsInstance.simulateClose(1006, "");
    }).not.toThrow();
  });

  // --- disconnect() 清理 ---
  it("disconnect closes WebSocket and sets ws to null", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    provider.disconnect();

    expect(mockWsInstance.close).toHaveBeenCalledTimes(1);
    expect(provider.isConnected()).toBe(false);
  });

  it("disconnect is safe to call when not connected", () => {
    // 未連線時呼叫 disconnect 不應拋錯
    expect(() => provider.disconnect()).not.toThrow();
  });

  it("disconnect prevents subsequent sendAudio from sending", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    const capturedWs = mockWsInstance;
    provider.disconnect();

    // disconnect 之後 sendAudio 不應發送
    provider.sendAudio(new Float32Array([0.1]));
    // close 被 disconnect 呼叫一次，send 不應被呼叫
    expect(capturedWs.send).not.toHaveBeenCalled();
  });

  // --- 多次 connect ---
  it("resets _intentionalClose flag on reconnect", async () => {
    // 第一次連線然後斷開
    const connectPromise1 = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise1;
    provider.disconnect();

    // 第二次連線
    const errorCb = vi.fn();
    provider.onError(errorCb);

    const connectPromise2 = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise2;

    // 非主動斷線應觸發 error callback
    mockWsInstance.simulateClose(1006, "");
    expect(errorCb).toHaveBeenCalledTimes(1);
  });
});
