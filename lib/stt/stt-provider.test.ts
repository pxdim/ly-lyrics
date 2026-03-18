import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepgramProvider } from "./deepgram-provider";
import type { STTConfig } from "./types";

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

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
}

let mockWsInstance: MockWebSocket;

const MockWebSocketFactory = vi.fn(function MockWebSocketConstructor(_: string, __?: string | string[]) {
  mockWsInstance = new MockWebSocket();
  return mockWsInstance;
}) as unknown as typeof WebSocket;
// 讓 WebSocket.OPEN 等靜態常數與真實 WebSocket 一致，provider 內部會引用
const factoryAsRecord = MockWebSocketFactory as unknown as Record<string, number>;
factoryAsRecord["CONNECTING"] = 0;
factoryAsRecord["OPEN"] = 1;
factoryAsRecord["CLOSING"] = 2;
factoryAsRecord["CLOSED"] = 3;

vi.stubGlobal("WebSocket", MockWebSocketFactory);

const testConfig: STTConfig = {
  language: "zh-TW",
  sampleRate: 16000,
  apiKey: "dg-test-key",
};

describe("DeepgramProvider", () => {
  let provider: DeepgramProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new DeepgramProvider();
  });

  it("has name 'deepgram'", () => {
    expect(provider.name).toBe("deepgram");
  });

  it("connect creates WebSocket with correct URL", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    expect(WebSocket).toHaveBeenCalledWith(
      expect.stringContaining("wss://api.deepgram.com/v1/listen"),
      ["token", testConfig.apiKey]
    );
    expect(provider.isConnected()).toBe(true);
  });

  it("disconnect closes WebSocket", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    provider.disconnect();
    expect(mockWsInstance.close).toHaveBeenCalled();
  });

  it("sendAudio sends binary data when connected", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    const audioData = new Float32Array([0.1, -0.2, 0.3]);
    provider.sendAudio(audioData);
    expect(mockWsInstance.send).toHaveBeenCalled();
  });

  it("onTranscript callback receives parsed Deepgram response", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    const deepgramResponse = JSON.stringify({
      channel: {
        alternatives: [{ transcript: "天空下起了小雨" }],
      },
      is_final: true,
    });
    mockWsInstance.simulateMessage(deepgramResponse);

    expect(callback).toHaveBeenCalledWith("天空下起了小雨", true);
  });

  it("onTranscript handles interim results", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    const interimResponse = JSON.stringify({
      channel: {
        alternatives: [{ transcript: "天空下" }],
      },
      is_final: false,
    });
    mockWsInstance.simulateMessage(interimResponse);

    expect(callback).toHaveBeenCalledWith("天空下", false);
  });

  it("onError callback fires on WebSocket error", async () => {
    const errorCallback = vi.fn();
    provider.onError(errorCallback);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    mockWsInstance.simulateClose();
    expect(errorCallback).toHaveBeenCalled();
  });
});
