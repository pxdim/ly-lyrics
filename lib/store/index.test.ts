/**
 * Zustand Store 單元測試
 *
 * 覆蓋範圍：Navigation、Song 操作、Connection、Business Events、
 * Session、Playback、Display Settings、Misc Actions、Selectors
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ============================================================================
// Mock 設定：必須在 import store 之前
// ============================================================================

// 儲存 ws.on() 註冊的所有 callback，方便觸發模擬事件
const mockWsCallbacks = new Map<string, (...args: never[]) => void>();

const mockWs = {
  on: vi.fn((event: string, cb: (...args: never[]) => void) => {
    mockWsCallbacks.set(event, cb);
  }),
  off: vi.fn(),
  removeAllListeners: vi.fn(() => {
    mockWsCallbacks.clear();
  }),
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

/**
 * 觸發模擬 WebSocket 事件（呼叫 ws.on() 註冊的 callback）
 */
function triggerWsEvent(event: string, payload?: unknown) {
  const cb = mockWsCallbacks.get(event);
  if (cb) {
    (cb as (data: unknown) => void)(payload);
  }
}

// import store AFTER vi.mock()
import {
  useLyricsStore,
  selectVisibleLyrics,
  selectConnectionStatus,
  selectNavigationState,
} from "./index";

// ============================================================================
// 共用 Helper
// ============================================================================

/** 重置 store 到初始狀態，並清理所有 mock */
function resetStore() {
  useLyricsStore.setState({
    currentSong: null,
    currentIndex: 0,
    lyrics: [],
    connectionState: "disconnected",
    reconnectAttempt: 0,
    sessionId: null,
    role: null,
    userId: null,
    controllerCount: 0,
    displayCount: 0,
    displaySettings: {
      displayLines: 4,
      fontSize: 32,
      fontFamily: "Inter",
      lineSpacing: 0.5,
      theme: "dark",
      showBackground: true,
      backgroundColor: "#000000",
      textColor: "#ffffff",
      highlightColor: "#0ea5e9",
      autoScroll: true,
      scrollDuration: 300,
      enableAnimation: true,
    },
    isPlaying: false,
    isLoading: false,
    error: null,
  });

  vi.clearAllMocks();
  mockWsCallbacks.clear();
}

beforeEach(() => {
  resetStore();
});

// ============================================================================
// Task 1: Navigation Tests
// ============================================================================

describe("Navigation", () => {
  it("nextLine 應該前進到下一行", () => {
    useLyricsStore.setState({
      lyrics: ["line0", "line1", "line2"],
      currentIndex: 0,
    });

    useLyricsStore.getState().nextLine();

    expect(useLyricsStore.getState().currentIndex).toBe(1);
  });

  it("nextLine 到最後一行時不應超出邊界", () => {
    useLyricsStore.setState({
      lyrics: ["line0", "line1", "line2"],
      currentIndex: 2,
    });

    useLyricsStore.getState().nextLine();

    expect(useLyricsStore.getState().currentIndex).toBe(2);
  });

  it("nextLine 在空歌詞時不應產生 -1 index（已知 bug）", () => {
    useLyricsStore.setState({
      lyrics: [],
      currentIndex: 0,
    });

    useLyricsStore.getState().nextLine();

    // Bug: Math.min(0 + 1, -1) = -1，修正後應維持 0
    expect(useLyricsStore.getState().currentIndex).toBe(0);
  });

  it("prevLine 應該回到上一行", () => {
    useLyricsStore.setState({
      lyrics: ["line0", "line1", "line2"],
      currentIndex: 2,
    });

    useLyricsStore.getState().prevLine();

    expect(useLyricsStore.getState().currentIndex).toBe(1);
  });

  it("prevLine 在第一行時不應低於 0", () => {
    useLyricsStore.setState({
      lyrics: ["line0", "line1", "line2"],
      currentIndex: 0,
    });

    useLyricsStore.getState().prevLine();

    expect(useLyricsStore.getState().currentIndex).toBe(0);
  });

  it("jumpToLine 應該跳到指定行", () => {
    useLyricsStore.setState({
      lyrics: ["line0", "line1", "line2", "line3"],
      currentIndex: 0,
    });

    useLyricsStore.getState().jumpToLine(3);

    expect(useLyricsStore.getState().currentIndex).toBe(3);
  });

  it("jumpToLine 在空歌詞時不應產生 -1 index（已知 bug）", () => {
    useLyricsStore.setState({
      lyrics: [],
      currentIndex: 0,
    });

    useLyricsStore.getState().jumpToLine(5);

    // Bug: Math.max(0, Math.min(5, -1)) = -1，修正後應維持 0
    expect(useLyricsStore.getState().currentIndex).toBe(0);
  });
});

// ============================================================================
// Task 2: Song Operations
// ============================================================================

describe("Song Operations", () => {
  it("setCurrentSong 應設定歌曲並重置 index", () => {
    const song = {
      id: "s1",
      title: "Test Song",
      artist: "Artist",
      lyrics: ["hello", "world"],
      userId: "u1",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    };

    useLyricsStore.getState().setCurrentSong(song);
    const state = useLyricsStore.getState();

    expect(state.currentSong).toEqual(song);
    expect(state.lyrics).toEqual(["hello", "world"]);
    expect(state.currentIndex).toBe(0);
  });

  it("setCurrentSong(null) 應清除歌曲和歌詞", () => {
    useLyricsStore.setState({
      currentSong: { id: "s1", title: "X", lyrics: ["a"], userId: "u", createdAt: "", updatedAt: "" },
      lyrics: ["a"],
      currentIndex: 0,
    });

    useLyricsStore.getState().setCurrentSong(null);
    const state = useLyricsStore.getState();

    expect(state.currentSong).toBeNull();
    expect(state.lyrics).toEqual([]);
    expect(state.currentIndex).toBe(0);
  });

  it("setLyrics 應更新歌詞並重置 index", () => {
    useLyricsStore.setState({ currentIndex: 5 });

    useLyricsStore.getState().setLyrics(["new1", "new2"]);
    const state = useLyricsStore.getState();

    expect(state.lyrics).toEqual(["new1", "new2"]);
    expect(state.currentIndex).toBe(0);
  });

  it("setLyrics([]) 應清空歌詞", () => {
    useLyricsStore.setState({ lyrics: ["old"], currentIndex: 0 });

    useLyricsStore.getState().setLyrics([]);

    expect(useLyricsStore.getState().lyrics).toEqual([]);
    expect(useLyricsStore.getState().currentIndex).toBe(0);
  });
});

// ============================================================================
// Task 2: Connection State
// ============================================================================

describe("Connection State", () => {
  it("connect 應呼叫 removeAllListeners 並註冊事件", () => {
    useLyricsStore.getState().connect();

    expect(mockWs.removeAllListeners).toHaveBeenCalledOnce();
    expect(mockWs.on).toHaveBeenCalled();
    // 至少註冊了 _connected, _disconnected, _reconnecting, _reconnect_exhausted, 以及業務事件
    expect(mockWs.on.mock.calls.length).toBeGreaterThanOrEqual(8);
  });

  it("disconnect 應清除連線狀態並呼叫 ws 方法", () => {
    useLyricsStore.setState({
      connectionState: "connected",
      sessionId: "s1",
      role: "controller",
      controllerCount: 2,
      displayCount: 3,
    });

    useLyricsStore.getState().disconnect();
    const state = useLyricsStore.getState();

    expect(mockWs.removeAllListeners).toHaveBeenCalled();
    expect(mockWs.disconnect).toHaveBeenCalled();
    expect(state.connectionState).toBe("disconnected");
    expect(state.reconnectAttempt).toBe(0);
    expect(state.sessionId).toBeNull();
    expect(state.role).toBeNull();
    expect(state.controllerCount).toBe(0);
    expect(state.displayCount).toBe(0);
  });

  it("_connected 事件應設為 connected 並重置 reconnectAttempt", () => {
    useLyricsStore.getState().connect();

    triggerWsEvent("_connected");

    expect(useLyricsStore.getState().connectionState).toBe("connected");
    expect(useLyricsStore.getState().reconnectAttempt).toBe(0);
  });

  it("_reconnecting 事件應更新 reconnectAttempt", () => {
    useLyricsStore.getState().connect();

    triggerWsEvent("_reconnecting", { attempt: 3, maxAttempts: 5 });

    expect(useLyricsStore.getState().reconnectAttempt).toBe(3);
  });

  it("_disconnected 事件應設為 reconnecting", () => {
    useLyricsStore.getState().connect();

    triggerWsEvent("_disconnected");

    expect(useLyricsStore.getState().connectionState).toBe("reconnecting");
  });

  it("_reconnect_exhausted 事件應設為 disconnected", () => {
    useLyricsStore.getState().connect();

    triggerWsEvent("_reconnect_exhausted");

    expect(useLyricsStore.getState().connectionState).toBe("disconnected");
  });
});

// ============================================================================
// Task 2: Business Events
// ============================================================================

describe("Business Events", () => {
  beforeEach(() => {
    // 先 connect 以註冊所有事件 handler
    useLyricsStore.getState().connect();
  });

  it("session_state 應同步完整 session 狀態", () => {
    const song = {
      id: "s1",
      title: "Song",
      lyrics: ["a", "b"],
      userId: "u1",
      createdAt: "",
      updatedAt: "",
    };

    triggerWsEvent("session_state", {
      sessionId: "sess1",
      currentSong: song,
      currentLineIndex: 1,
      isPlaying: true,
      settings: {},
      controllerCount: 2,
      displayCount: 5,
    });

    const state = useLyricsStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
    expect(state.controllerCount).toBe(2);
    expect(state.displayCount).toBe(5);
    expect(state.currentSong).toEqual(song);
    expect(state.lyrics).toEqual(["a", "b"]);
  });

  it("line_changed 應更新 currentIndex", () => {
    triggerWsEvent("line_changed", { lineIndex: 7 });

    expect(useLyricsStore.getState().currentIndex).toBe(7);
  });

  it("song_changed 應更新歌曲並重置 index", () => {
    const song = {
      id: "s2",
      title: "New",
      lyrics: ["x", "y", "z"],
      userId: "u1",
      createdAt: "",
      updatedAt: "",
    };

    triggerWsEvent("song_changed", { song });

    const state = useLyricsStore.getState();
    expect(state.currentSong).toEqual(song);
    expect(state.currentIndex).toBe(0);
    expect(state.lyrics).toEqual(["x", "y", "z"]);
  });

  it("settings_updated 應更新 displaySettings", () => {
    const settings = {
      displayLines: 8,
      fontSize: 48,
      fontFamily: "Arial",
      theme: "light" as const,
      showBackground: false,
      backgroundColor: "#fff",
      textColor: "#000",
      highlightColor: "#f00",
      autoScroll: false,
      scrollDuration: 500,
      enableAnimation: false,
    };

    triggerWsEvent("settings_updated", { settings });

    expect(useLyricsStore.getState().displaySettings).toEqual(settings);
  });

  it("playing_changed 應更新 isPlaying", () => {
    triggerWsEvent("playing_changed", { isPlaying: true });

    expect(useLyricsStore.getState().isPlaying).toBe(true);
  });

  it("client_joined 應更新裝置計數", () => {
    triggerWsEvent("client_joined", {
      clientId: "c1",
      role: "display",
      controllerCount: 1,
      displayCount: 3,
    });

    expect(useLyricsStore.getState().controllerCount).toBe(1);
    expect(useLyricsStore.getState().displayCount).toBe(3);
  });

  it("client_left 應更新裝置計數", () => {
    useLyricsStore.setState({ controllerCount: 2, displayCount: 5 });

    triggerWsEvent("client_left", {
      clientId: "c2",
      role: "display",
      controllerCount: 2,
      displayCount: 4,
    });

    expect(useLyricsStore.getState().controllerCount).toBe(2);
    expect(useLyricsStore.getState().displayCount).toBe(4);
  });

  it("error 事件應設定 error 訊息", () => {
    triggerWsEvent("error", { message: "Something went wrong" });

    expect(useLyricsStore.getState().error).toBe("Something went wrong");
  });
});

// ============================================================================
// Task 3: Session Operations
// ============================================================================

describe("Session Operations", () => {
  it("joinSession 應呼叫 ws.joinSession 並更新 store", () => {
    useLyricsStore.getState().joinSession("sess1", "controller", "user1");

    expect(mockWs.joinSession).toHaveBeenCalledWith("sess1", "controller", "user1");
    const state = useLyricsStore.getState();
    expect(state.sessionId).toBe("sess1");
    expect(state.role).toBe("controller");
    expect(state.userId).toBe("user1");
  });

  it("leaveSession 應呼叫 ws.leaveSession 並清除 session 資訊", () => {
    useLyricsStore.setState({ sessionId: "sess1", role: "controller" });

    useLyricsStore.getState().leaveSession();

    expect(mockWs.leaveSession).toHaveBeenCalled();
    expect(useLyricsStore.getState().sessionId).toBeNull();
    expect(useLyricsStore.getState().role).toBeNull();
  });

  it("joinSession 不帶 userId 時應設為 null", () => {
    useLyricsStore.getState().joinSession("sess2", "display");

    expect(mockWs.joinSession).toHaveBeenCalledWith("sess2", "display", undefined);
    expect(useLyricsStore.getState().userId).toBeNull();
  });
});

// ============================================================================
// Task 3: Playback
// ============================================================================

describe("Playback", () => {
  it("setPlaying 應更新 isPlaying 狀態", () => {
    useLyricsStore.getState().setPlaying(true);

    expect(useLyricsStore.getState().isPlaying).toBe(true);
  });

  it("togglePlaying 應反轉 isPlaying", () => {
    useLyricsStore.setState({ isPlaying: false });

    useLyricsStore.getState().togglePlaying();

    expect(useLyricsStore.getState().isPlaying).toBe(true);

    useLyricsStore.getState().togglePlaying();

    expect(useLyricsStore.getState().isPlaying).toBe(false);
  });

  it("setPlaying 作為 controller 時應透過 WS 傳送", () => {
    useLyricsStore.setState({ role: "controller" });
    mockWs.isConnected.mockReturnValue(true);

    useLyricsStore.getState().setPlaying(true);

    expect(mockWs.setPlaying).toHaveBeenCalledWith(true);
  });
});

// ============================================================================
// Task 3: Display Settings
// ============================================================================

describe("Display Settings", () => {
  it("updateDisplaySettings 應局部合併設定", () => {
    useLyricsStore.getState().updateDisplaySettings({ fontSize: 48, theme: "light" });

    const settings = useLyricsStore.getState().displaySettings;
    expect(settings.fontSize).toBe(48);
    expect(settings.theme).toBe("light");
    // 其餘保持預設
    expect(settings.displayLines).toBe(4);
    expect(settings.fontFamily).toBe("Inter");
  });

  it("resetDisplaySettings 應還原所有預設值", () => {
    useLyricsStore.setState({
      displaySettings: {
        displayLines: 10,
        fontSize: 64,
        fontFamily: "Mono",
        lineSpacing: 1.5,
        theme: "transparent",
        showBackground: false,
        backgroundColor: "#fff",
        textColor: "#000",
        highlightColor: "#f00",
        autoScroll: false,
        scrollDuration: 0,
        enableAnimation: false,
      },
    });

    useLyricsStore.getState().resetDisplaySettings();

    const settings = useLyricsStore.getState().displaySettings;
    expect(settings.displayLines).toBe(4);
    expect(settings.fontSize).toBe(32);
    expect(settings.fontFamily).toBe("Inter");
    expect(settings.theme).toBe("dark");
    expect(settings.autoScroll).toBe(true);
  });
});

// ============================================================================
// Task 3: Misc Actions
// ============================================================================

describe("Misc Actions", () => {
  it("retryConnection 應呼叫 ws.resetAndReconnect 並設為 reconnecting", () => {
    useLyricsStore.getState().retryConnection();

    expect(mockWs.resetAndReconnect).toHaveBeenCalled();
    expect(useLyricsStore.getState().connectionState).toBe("reconnecting");
    expect(useLyricsStore.getState().reconnectAttempt).toBe(0);
  });

  it("setLoading 應更新 isLoading", () => {
    useLyricsStore.getState().setLoading(true);
    expect(useLyricsStore.getState().isLoading).toBe(true);

    useLyricsStore.getState().setLoading(false);
    expect(useLyricsStore.getState().isLoading).toBe(false);
  });

  it("setError 與 clearError 應正確管理 error 狀態", () => {
    useLyricsStore.getState().setError("bad request");
    expect(useLyricsStore.getState().error).toBe("bad request");

    useLyricsStore.getState().clearError();
    expect(useLyricsStore.getState().error).toBeNull();
  });
});

// ============================================================================
// Task 3: Selectors
// ============================================================================

describe("Selectors", () => {
  it("selectVisibleLyrics 應回傳正確的可見歌詞窗口", () => {
    useLyricsStore.setState({
      lyrics: ["a", "b", "c", "d", "e", "f", "g", "h"],
      currentIndex: 4,
      displaySettings: {
        ...useLyricsStore.getState().displaySettings,
        displayLines: 4,
      },
    });

    const result = selectVisibleLyrics(useLyricsStore.getState());

    // displayLines=4, prevLines = floor(4/3) = 1
    // startIndex = max(0, 4-1) = 3
    // endIndex = min(8, 3+4) = 7
    expect(result.startIndex).toBe(3);
    expect(result.endIndex).toBe(7);
    expect(result.visibleLyrics).toEqual(["d", "e", "f", "g"]);
    expect(result.highlightIndex).toBe(1); // 4 - 3
  });

  it("selectConnectionStatus 應回傳連線摘要", () => {
    useLyricsStore.setState({
      connectionState: "connected",
      reconnectAttempt: 0,
      sessionId: "sess1",
      role: "controller",
      controllerCount: 1,
      displayCount: 2,
    });

    const result = selectConnectionStatus(useLyricsStore.getState());

    expect(result.isConnected).toBe(true);
    expect(result.connectionState).toBe("connected");
    expect(result.isInSession).toBe(true);
    expect(result.role).toBe("controller");
    expect(result.controllerCount).toBe(1);
    expect(result.displayCount).toBe(2);
  });

  it("selectNavigationState 應回傳導航狀態", () => {
    useLyricsStore.setState({
      lyrics: ["a", "b", "c"],
      currentIndex: 1,
      isPlaying: true,
    });

    const result = selectNavigationState(useLyricsStore.getState());

    expect(result.currentIndex).toBe(1);
    expect(result.totalLines).toBe(3);
    expect(result.canGoNext).toBe(true);
    expect(result.canGoPrev).toBe(true);
    expect(result.isPlaying).toBe(true);
  });

  it("selectNavigationState 在邊界時應正確判斷 canGoNext/canGoPrev", () => {
    // 第一行
    useLyricsStore.setState({
      lyrics: ["a", "b", "c"],
      currentIndex: 0,
    });

    let result = selectNavigationState(useLyricsStore.getState());
    expect(result.canGoNext).toBe(true);
    expect(result.canGoPrev).toBe(false);

    // 最後一行
    useLyricsStore.setState({ currentIndex: 2 });

    result = selectNavigationState(useLyricsStore.getState());
    expect(result.canGoNext).toBe(false);
    expect(result.canGoPrev).toBe(true);
  });
});

// ============================================================================
// AI Tracking actions
// ============================================================================

describe("AI Tracking actions", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useLyricsStore());
    act(() => {
      result.current.stopAiTracking();
    });
  });

  it("startAiTracking sets isActive and status to listening", () => {
    const { result } = renderHook(() => useLyricsStore());
    act(() => {
      result.current.startAiTracking();
    });
    expect(result.current.aiTracking.isActive).toBe(true);
    expect(result.current.aiTracking.status).toBe("listening");
  });

  it("stopAiTracking resets AI tracking state", () => {
    const { result } = renderHook(() => useLyricsStore());
    act(() => {
      result.current.startAiTracking();
      result.current.stopAiTracking();
    });
    expect(result.current.aiTracking.isActive).toBe(false);
    expect(result.current.aiTracking.status).toBe("idle");
  });

  it("updateAiStatus updates status and confidence", () => {
    const { result } = renderHook(() => useLyricsStore());
    act(() => {
      result.current.startAiTracking();
      result.current.updateAiStatus("matched", 0.85, 3);
    });
    expect(result.current.aiTracking.status).toBe("matched");
    expect(result.current.aiTracking.confidence).toBe(0.85);
    expect(result.current.aiTracking.lastMatchedLine).toBe(3);
  });

  it("triggerManualOverride sets cooldown status with timestamp", () => {
    const { result } = renderHook(() => useLyricsStore());
    const before = Date.now();
    act(() => {
      result.current.startAiTracking();
      result.current.triggerManualOverride();
    });
    expect(result.current.aiTracking.status).toBe("cooldown");
    expect(result.current.aiTracking.cooldownUntil).toBeGreaterThanOrEqual(before + 5000);
  });

  it("updateAudioInput partially updates audio input state", () => {
    const { result } = renderHook(() => useLyricsStore());
    act(() => {
      result.current.updateAudioInput({ gain: 10, volume: 0.7 });
    });
    expect(result.current.audioInput.gain).toBe(10);
    expect(result.current.audioInput.volume).toBe(0.7);
    expect(result.current.audioInput.deviceId).toBeNull(); // unchanged
  });

  it("updateAiSettings partially updates AI settings", () => {
    const { result } = renderHook(() => useLyricsStore());
    act(() => {
      result.current.updateAiSettings({ confidenceThreshold: 0.8 });
    });
    expect(result.current.aiSettings.confidenceThreshold).toBe(0.8);
    expect(result.current.aiSettings.sttProvider).toBe("google-cloud"); // unchanged default
  });
});
