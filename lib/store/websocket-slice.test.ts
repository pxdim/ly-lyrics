/**
 * WebSocket Slice 單元測試
 *
 * 測試 WebSocket 連線管理、session 操作、事件監聽註冊。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { createWebSocketSlice } from "./websocket-slice";
import type { LyricsStore } from "./types";

describe("createWebSocketSlice", () => {
  let state: ReturnType<typeof createWebSocketSlice>;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let storeState: Partial<LyricsStore>;

  beforeEach(() => {
    vi.clearAllMocks();

    storeState = {
      connectionState: "disconnected" as const,
      reconnectAttempt: 0,
      sessionId: null,
      role: null,
      userId: null,
      controllerCount: 0,
      displayCount: 0,
    };

    mockSet = vi.fn((partial) => {
      Object.assign(storeState, partial);
    });

    mockGet = vi.fn(() => storeState as LyricsStore);

    state = createWebSocketSlice(
      mockSet as unknown as Parameters<typeof createWebSocketSlice>[0],
      mockGet as unknown as Parameters<typeof createWebSocketSlice>[1],
      {} as Parameters<typeof createWebSocketSlice>[2],
    );
  });

  it("應提供正確的初始狀態", () => {
    expect(state.connectionState).toBe("disconnected");
    expect(state.reconnectAttempt).toBe(0);
    expect(state.sessionId).toBeNull();
    expect(state.role).toBeNull();
    expect(state.userId).toBeNull();
    expect(state.controllerCount).toBe(0);
    expect(state.displayCount).toBe(0);
  });

  it("connect 應清除舊監聽器並註冊事件", () => {
    state.connect();

    expect(mockWs.removeAllListeners).toHaveBeenCalledOnce();
    // 至少註冊 _connected, _disconnected, _reconnecting, _reconnect_exhausted 及業務事件
    expect(mockWs.on.mock.calls.length).toBeGreaterThanOrEqual(8);
  });

  it("disconnect 應清除連線狀態", () => {
    state.disconnect();

    expect(mockWs.removeAllListeners).toHaveBeenCalled();
    expect(mockWs.disconnect).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionState: "disconnected",
        sessionId: null,
        role: null,
      }),
    );
  });

  it("joinSession 應呼叫 ws.joinSession 並更新 store", () => {
    state.joinSession("sess1", "controller", "user1");

    expect(mockWs.joinSession).toHaveBeenCalledWith("sess1", "controller", "user1");
    expect(mockSet).toHaveBeenCalledWith({
      sessionId: "sess1",
      role: "controller",
      userId: "user1",
    });
  });

  it("leaveSession 應清除 session 資訊", () => {
    state.leaveSession();

    expect(mockWs.leaveSession).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith({ sessionId: null, role: null });
  });

  it("retryConnection 應重置並重新連線", () => {
    state.retryConnection();

    expect(mockWs.resetAndReconnect).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith({
      connectionState: "reconnecting",
      reconnectAttempt: 0,
    });
  });
});
