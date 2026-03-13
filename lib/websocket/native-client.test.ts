/**
 * NativeWSClient 單元測試
 *
 * 測試連線管理、事件發送/接收、重連邏輯、Session 恢復、事件監聽器管理。
 * 使用 MockWebSocket 取代全域 WebSocket 建構子。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Mock WebSocket
// ============================================================================

let mockWsInstance: InstanceType<typeof MockWebSocket>;

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState = MockWebSocket.OPEN;
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockWsInstance = this;
  }
}

vi.stubGlobal("WebSocket", MockWebSocket);

// 在 mock 設置後才 import，確保 NativeWSClient 拿到的是 MockWebSocket
import { NativeWSClient } from "./native-client";

// ============================================================================
// 輔助函式
// ============================================================================

function simulateOpen() {
  mockWsInstance.onopen?.(new Event("open"));
}

function simulateClose(code = 1000, reason = "") {
  mockWsInstance.readyState = MockWebSocket.CLOSED;
  mockWsInstance.onclose?.({ code, reason });
}

function simulateMessage(type: string, payload?: unknown) {
  const msg: Record<string, unknown> = { type };
  if (payload !== undefined) {
    msg["payload"] = payload;
  }
  mockWsInstance.onmessage?.({ data: JSON.stringify(msg) });
}

// ============================================================================
// 測試
// ============================================================================

describe("NativeWSClient", () => {
  let client: NativeWSClient;

  beforeEach(() => {
    vi.useFakeTimers();
    client = new NativeWSClient("ws://test:8080/ws");
  });

  afterEach(() => {
    client.disconnect();
    client.removeAllListeners();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ==========================================================================
  // 連線管理
  // ==========================================================================

  describe("連線管理", () => {
    it("connect() 使用正確的 URL 建立 WebSocket", () => {
      client.connect();
      expect(mockWsInstance.url).toBe("ws://test:8080/ws");
    });

    it("disconnect() 呼叫 ws.close()", () => {
      client.connect();
      const ws = mockWsInstance;
      client.disconnect();
      expect(ws.close).toHaveBeenCalled();
    });

    it("isConnected() 在 OPEN 狀態回傳 true，disconnect 後回傳 false", () => {
      client.connect();
      // MockWebSocket 預設 readyState = OPEN
      expect(client.isConnected()).toBe(true);

      client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it("重複呼叫 connect() 不會建立第二個連線", () => {
      client.connect();
      const firstWs = mockWsInstance;

      client.connect();
      // mockWsInstance 應仍指向同一個物件，因為第二次 connect 被跳過
      expect(mockWsInstance).toBe(firstWs);
    });
  });

  // ==========================================================================
  // 事件發送
  // ==========================================================================

  describe("事件發送", () => {
    beforeEach(() => {
      client.connect();
      simulateOpen();
    });

    it("changeLine(3) 發送正確的 JSON 訊息", () => {
      client.changeLine(3);
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "change_line", payload: { lineIndex: 3 } })
      );
    });

    it("nextLine() 發送正確的 JSON 訊息", () => {
      client.nextLine();
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "next_line" })
      );
    });

    it("prevLine() 發送正確的 JSON 訊息", () => {
      client.prevLine();
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "prev_line" })
      );
    });

    it('setSong("abc") 發送正確的 payload', () => {
      client.setSong("abc");
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "set_song", payload: { songId: "abc" } })
      );
    });

    it("setPlaying(true) 發送正確的 payload", () => {
      client.setPlaying(true);
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "set_playing", payload: { isPlaying: true } })
      );
    });

    it("updateSettings({fontSize:24}) 發送正確的 payload", () => {
      client.updateSettings({ fontSize: 24 });
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "update_settings", payload: { fontSize: 24 } })
      );
    });

    it("joinSession 發送包含 userId 的正確 payload", () => {
      client.joinSession("session-1", "controller", "user-42");
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: "join_session",
          payload: {
            sessionId: "session-1",
            role: "controller",
            userId: "user-42",
          },
        })
      );
    });

    it("joinSession 在 userId 未定義時不包含 userId 欄位", () => {
      client.joinSession("session-1", "display");
      const rawCall = mockWsInstance.send.mock.calls[0];
      expect(rawCall).toBeDefined();
      const sentData = JSON.parse(rawCall![0] as string);
      expect(sentData["payload"]).toEqual({
        sessionId: "session-1",
        role: "display",
      });
      expect("userId" in (sentData["payload"] as Record<string, unknown>)).toBe(false);
    });

    it("leaveSession 發送無 payload 的訊息", () => {
      client.leaveSession();
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "leave_session" })
      );
    });
  });

  // ==========================================================================
  // 事件接收
  // ==========================================================================

  describe("事件接收", () => {
    beforeEach(() => {
      client.connect();
      simulateOpen();
    });

    it("伺服器推送 line_changed 時觸發 on() 回呼", () => {
      const callback = vi.fn();
      client.on("line_changed", callback);

      const payload = { lineIndex: 5, timestamp: Date.now() };
      simulateMessage("line_changed", payload);

      expect(callback).toHaveBeenCalledWith(payload);
    });

    it("伺服器推送 song_changed 時觸發回呼", () => {
      const callback = vi.fn();
      client.on("song_changed", callback);

      const payload = { songId: "song-1", song: null, timestamp: Date.now() };
      simulateMessage("song_changed", payload);

      expect(callback).toHaveBeenCalledWith(payload);
    });

    it("伺服器推送 playing_changed 時觸發回呼", () => {
      const callback = vi.fn();
      client.on("playing_changed", callback);

      const payload = { isPlaying: true, timestamp: Date.now() };
      simulateMessage("playing_changed", payload);

      expect(callback).toHaveBeenCalledWith(payload);
    });

    it("伺服器推送 error 時觸發回呼", () => {
      const callback = vi.fn();
      client.on("error", callback);

      const payload = { message: "session not found" };
      simulateMessage("error", payload);

      expect(callback).toHaveBeenCalledWith(payload);
    });
  });

  // ==========================================================================
  // 內部事件
  // ==========================================================================

  describe("內部事件", () => {
    it("onopen 觸發 _connected 事件", () => {
      const callback = vi.fn();
      client.on("_connected", callback);

      client.connect();
      simulateOpen();

      expect(callback).toHaveBeenCalled();
    });

    it("onclose 觸發 _disconnected 事件", () => {
      const callback = vi.fn();
      client.on("_disconnected", callback);

      client.connect();
      simulateOpen();
      simulateClose();

      expect(callback).toHaveBeenCalled();
    });

    it("重連期間觸發 _reconnecting 事件並帶有正確的 attempt 資訊", () => {
      const callback = vi.fn();
      client.on("_reconnecting", callback);

      client.connect();
      simulateOpen();
      simulateClose();

      // 第一次重連延遲: 1000 * 1.5^0 = 1000ms
      vi.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledWith({
        attempt: 1,
        maxAttempts: 5,
      });
    });
  });

  // ==========================================================================
  // 重連邏輯
  // ==========================================================================

  describe("重連邏輯", () => {
    it("斷線後自動重連（建立新的 WebSocket 實例）", () => {
      client.connect();
      simulateOpen();
      const firstWs = mockWsInstance;

      simulateClose();

      // 第一次重連延遲: 1000ms
      vi.advanceTimersByTime(1000);

      // 重連應建立新的 WebSocket 實例
      expect(mockWsInstance).not.toBe(firstWs);
      expect(mockWsInstance.url).toBe("ws://test:8080/ws");
    });

    it("指數退避延遲：第一次 1000ms、第二次 1500ms", () => {
      client.connect();
      simulateOpen();

      // 第一次斷線
      simulateClose();
      const firstWs = mockWsInstance;

      // 999ms 後尚未重連
      vi.advanceTimersByTime(999);
      expect(mockWsInstance).toBe(firstWs);

      // 到 1000ms 觸發第一次重連（delay = 1000 * 1.5^0 = 1000）
      // setTimeout 回呼中：reconnectAttempts++ (變 1)，然後 connect()
      vi.advanceTimersByTime(1);
      const secondWs = mockWsInstance;
      expect(secondWs).not.toBe(firstWs);

      // 第二次連線失敗（不觸發 onopen，以保持 reconnectAttempts = 1）
      simulateClose();

      // 第二次延遲: 1000 * 1.5^1 = 1500ms
      vi.advanceTimersByTime(1499);
      expect(mockWsInstance).toBe(secondWs);

      vi.advanceTimersByTime(1);
      expect(mockWsInstance).not.toBe(secondWs);
    });

    it("達到最大重試次數 (5) 時觸發 _reconnect_exhausted", () => {
      const exhaustedCb = vi.fn();
      client.on("_reconnect_exhausted", exhaustedCb);

      client.connect();
      simulateOpen();

      // 初始斷線，啟動重連流程
      simulateClose();

      // 模擬 5 次重連都失敗（不觸發 onopen 以避免重置 reconnectAttempts）
      // attemptReconnect 在 setTimeout 內: reconnectAttempts++ 後呼叫 connect()
      for (let i = 0; i < 5; i++) {
        // 延遲: min(1000 * 1.5^i, 5000)
        const delay = Math.min(1000 * Math.pow(1.5, i), 5000);
        vi.advanceTimersByTime(delay);
        // connect() 建立新 WS，直接斷線（不 open）
        simulateClose();
      }

      // 第 6 次 attemptReconnect: reconnectAttempts=5 >= maxReconnectAttempts=5
      // 進入 exhausted 分支
      expect(exhaustedCb).toHaveBeenCalled();
    });

    it("手動 disconnect() 後不觸發自動重連", () => {
      client.connect();
      simulateOpen();
      const wsBeforeDisconnect = mockWsInstance;

      client.disconnect();

      // 前進大量時間，確認沒有新的 WebSocket 建立
      vi.advanceTimersByTime(30000);

      // disconnect 會將 ws 設為 null，所以 mockWsInstance 仍是 disconnect 前那個
      expect(mockWsInstance).toBe(wsBeforeDisconnect);
    });
  });

  // ==========================================================================
  // Session 恢復
  // ==========================================================================

  describe("Session 恢復", () => {
    it("重連後自動重新加入先前的 session", () => {
      client.connect();
      simulateOpen();
      client.joinSession("room-A", "controller", "user-1");

      // 清除之前的 send 呼叫記錄
      mockWsInstance.send.mockClear();

      // 斷線並重連
      simulateClose();
      vi.advanceTimersByTime(1000);

      // 模擬新連線 open
      simulateOpen();

      // 應自動發送 join_session
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: "join_session",
          payload: {
            sessionId: "room-A",
            role: "controller",
            userId: "user-1",
          },
        })
      );
    });

    it("沒有 session 時重連後不會發送 join", () => {
      client.connect();
      simulateOpen();

      mockWsInstance.send.mockClear();

      simulateClose();
      vi.advanceTimersByTime(1000);
      simulateOpen();

      // 不應該有任何 send 呼叫
      expect(mockWsInstance.send).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 事件監聽器管理
  // ==========================================================================

  describe("事件監聽器管理", () => {
    it("off() 移除特定的回呼函式", () => {
      const callback = vi.fn();
      client.on("line_changed", callback);

      client.connect();
      simulateOpen();

      client.off("line_changed", callback);

      simulateMessage("line_changed", { lineIndex: 1, timestamp: Date.now() });
      expect(callback).not.toHaveBeenCalled();
    });

    it("removeAllListeners() 清除所有監聽器", () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      client.on("line_changed", cb1);
      client.on("song_changed", cb2);

      client.connect();
      simulateOpen();

      client.removeAllListeners();

      simulateMessage("line_changed", { lineIndex: 0, timestamp: Date.now() });
      simulateMessage("song_changed", { songId: "x", song: null, timestamp: Date.now() });

      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).not.toHaveBeenCalled();
    });
  });
});
