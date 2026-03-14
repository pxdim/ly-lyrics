/**
 * Store Persistence 安全性測試
 *
 * 確保 partialize 函式不會將敏感資料（如 apiKey）寫入 localStorage。
 */

import { describe, it, expect, vi } from "vitest";

// Mock WebSocket 以避免真實連線
vi.mock("@/lib/websocket/native-client", () => ({
  initNativeWSClient: () => ({
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(() => false),
    connect: vi.fn(),
    joinSession: vi.fn(),
    leaveSession: vi.fn(),
    nextLine: vi.fn(),
    prevLine: vi.fn(),
    changeLine: vi.fn(),
    setSong: vi.fn(),
    updateSettings: vi.fn(),
    setPlaying: vi.fn(),
    resetAndReconnect: vi.fn(),
  }),
}));

import { useLyricsStore } from "./index";

describe("store persistence (partialize)", () => {
  it("不應將 apiKey 持久化到 localStorage", () => {
    // Zustand v5 persist middleware 透過 persist.getOptions() 取得設定
    const persistApi = useLyricsStore.persist;
    const options = persistApi.getOptions();
    const partialize = options.partialize;

    expect(partialize).toBeDefined();

    // 模擬一個含有 apiKey 的完整 state
    const mockState = {
      displaySettings: { fontSize: 32 },
      role: "controller" as const,
      userId: "user-1",
      aiSettings: {
        sttProvider: "google-cloud" as const,
        apiKey: "secret-api-key-12345",
        confidenceThreshold: 0.45,
        windowBefore: 2,
        windowAfter: 5,
        manualOverrideCooldown: 5000,
        fullScanThreshold: 0.7,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const persisted = partialize!(mockState as any);

    // apiKey 不應出現在持久化資料中
    expect(persisted.aiSettings.apiKey).toBeNull();
    // 其他 aiSettings 欄位應正常保留
    expect(persisted.aiSettings.confidenceThreshold).toBe(0.45);
    expect(persisted.aiSettings.sttProvider).toBe("google-cloud");
    expect(persisted.aiSettings.windowBefore).toBe(2);
    expect(persisted.aiSettings.windowAfter).toBe(5);
    expect(persisted.aiSettings.manualOverrideCooldown).toBe(5000);
    expect(persisted.aiSettings.fullScanThreshold).toBe(0.7);
  });

  it("即使 apiKey 為 null 也應保持為 null", () => {
    const persistApi = useLyricsStore.persist;
    const options = persistApi.getOptions();
    const partialize = options.partialize;

    const mockState = {
      displaySettings: {},
      role: null,
      userId: null,
      aiSettings: {
        sttProvider: "google-cloud" as const,
        apiKey: null,
        confidenceThreshold: 0.45,
        windowBefore: 2,
        windowAfter: 5,
        manualOverrideCooldown: 5000,
        fullScanThreshold: 0.7,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const persisted = partialize!(mockState as any);
    expect(persisted.aiSettings.apiKey).toBeNull();
  });
});
