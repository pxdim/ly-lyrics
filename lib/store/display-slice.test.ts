/**
 * Display Slice 單元測試
 *
 * 測試 display slice 的設定管理、控制模式與 UI 狀態。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock WebSocket
const mockWs = {
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
};

vi.mock("@/lib/websocket/native-client", () => ({
  initNativeWSClient: () => mockWs,
}));

import { createDisplaySlice, defaultDisplaySettings } from "./display-slice";
import type { LyricsStore } from "./types";

describe("createDisplaySlice", () => {
  let state: ReturnType<typeof createDisplaySlice>;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let storeState: Partial<LyricsStore>;

  beforeEach(() => {
    vi.clearAllMocks();

    storeState = {
      displaySettings: { ...defaultDisplaySettings },
      controlMode: "manual" as const,
      isLoading: false,
      error: null,
      role: null,
    };

    mockSet = vi.fn((partial) => {
      Object.assign(storeState, partial);
    });

    mockGet = vi.fn(() => storeState as LyricsStore);

    state = createDisplaySlice(
      mockSet as unknown as Parameters<typeof createDisplaySlice>[0],
      mockGet as unknown as Parameters<typeof createDisplaySlice>[1],
      {} as Parameters<typeof createDisplaySlice>[2],
    );
  });

  it("應提供正確的初始狀態", () => {
    expect(state.displaySettings).toEqual(defaultDisplaySettings);
    expect(state.controlMode).toBe("manual");
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("updateDisplaySettings 應局部合併設定", () => {
    state.updateDisplaySettings({ fontSize: 48 });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        displaySettings: expect.objectContaining({ fontSize: 48 }),
      }),
    );
  });

  it("resetDisplaySettings 應還原預設值", () => {
    state.resetDisplaySettings();

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        displaySettings: defaultDisplaySettings,
      }),
    );
  });

  it("setControlMode 應切換控制模式", () => {
    state.setControlMode("auto");

    expect(mockSet).toHaveBeenCalledWith({ controlMode: "auto" });
  });

  it("setLoading 應更新載入狀態", () => {
    state.setLoading(true);

    expect(mockSet).toHaveBeenCalledWith({ isLoading: true });
  });

  it("setError 應設定錯誤訊息", () => {
    state.setError("something wrong");

    expect(mockSet).toHaveBeenCalledWith({ error: "something wrong" });
  });

  it("clearError 應清除錯誤", () => {
    state.clearError();

    expect(mockSet).toHaveBeenCalledWith({ error: null });
  });
});
