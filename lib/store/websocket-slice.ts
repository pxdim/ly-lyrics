/**
 * WebSocket Slice — 連線狀態與 WebSocket 事件監聽
 *
 * 負責管理 WebSocket 連線生命週期、session 加入/離開、
 * 以及接收後端廣播事件（跨 slice 更新 lyrics/display 狀態）。
 */

import { initNativeWSClient } from "../websocket/native-client";
import { logger } from "../utils/logger";
import type { SessionState, Song, DisplaySettings } from "../websocket/types";
import type {
  WebSocketSliceState,
  WebSocketSliceActions,
  SliceCreator,
} from "./types";

type WebSocketSlice = WebSocketSliceState & WebSocketSliceActions;

export const createWebSocketSlice: SliceCreator<WebSocketSlice> = (set, get) => ({
  // 初始狀態
  connectionState: "disconnected" as const,
  reconnectAttempt: 0,
  sessionId: null,
  role: null,
  userId: null,
  controllerCount: 0,
  displayCount: 0,

  // 連線操作
  connect: () => {
    try {
      const ws = initNativeWSClient();

      // 先清除所有舊監聽器，防止多次 connect() 導致監聽器累積（記憶體洩漏）
      ws.removeAllListeners();

      // 連線狀態追蹤：透過內部事件同步真實 WebSocket 狀態
      ws.on("_connected", () => {
        set({ connectionState: "connected", reconnectAttempt: 0 });
      });

      ws.on("_disconnected", () => {
        // shouldReconnect 為 true 時會自動重試，先進入 reconnecting 狀態
        set({ connectionState: "reconnecting" });
      });

      ws.on("_reconnecting", (data: { attempt: number; maxAttempts: number }) => {
        set({ reconnectAttempt: data.attempt });
      });

      ws.on("_reconnect_exhausted", () => {
        set({ connectionState: "disconnected" });
      });

      // 業務事件監聯：跨 slice 更新（透過 set() 直接更新其他 slice 的 state）
      ws.on("line_changed", ({ lineIndex }: { lineIndex: number }) => {
        // 避免 Controller 自己發送的事件重複更新
        if (get().currentIndex !== lineIndex) {
          set({ currentIndex: lineIndex });
        }
      });

      ws.on("session_state", (state: SessionState) => {
        // 合併為單次 set() 避免雙重 re-render
        if (state.currentSong) {
          set({
            currentIndex: state.currentLineIndex,
            isPlaying: state.isPlaying,
            controllerCount: state.controllerCount,
            displayCount: state.displayCount,
            currentSong: state.currentSong,
            lyrics: state.currentSong.lyrics ?? [],
          });
        } else {
          set({
            currentIndex: state.currentLineIndex,
            isPlaying: state.isPlaying,
            controllerCount: state.controllerCount,
            displayCount: state.displayCount,
          });
        }
      });

      ws.on("song_changed", ({ song }: { song: Song | null }) => {
        set({
          currentSong: song,
          currentIndex: 0,
          lyrics: song?.lyrics ?? [],
        });
      });

      ws.on("settings_updated", ({ settings }: { settings: DisplaySettings }) => {
        set({ displaySettings: settings });
      });

      ws.on("playing_changed", ({ isPlaying }: { isPlaying: boolean }) => {
        set({ isPlaying });
      });

      ws.on("client_joined", ({ controllerCount, displayCount }: { controllerCount: number; displayCount: number }) => {
        set({ controllerCount, displayCount });
      });

      ws.on("client_left", ({ controllerCount, displayCount }: { controllerCount: number; displayCount: number }) => {
        set({ controllerCount, displayCount });
      });

      ws.on("error", ({ message }: { message: string }) => {
        set({ error: message });
      });

      // 如果 WebSocket 已經連上（singleton 可能已經在連線中），立即同步狀態
      if (ws.isConnected()) {
        set({ connectionState: "connected", reconnectAttempt: 0 });
      }
    } catch (error) {
      logger.error("Failed to connect to WebSocket:", error);
      set({
        error: error instanceof Error ? error.message : "Connection failed",
      });
    }
  },

  disconnect: () => {
    const ws = initNativeWSClient();
    ws.removeAllListeners();
    ws.disconnect();
    set({
      connectionState: "disconnected" as const,
      reconnectAttempt: 0,
      sessionId: null,
      role: null,
      controllerCount: 0,
      displayCount: 0,
    });
  },

  joinSession: (sessionId, role, userId) => {
    const ws = initNativeWSClient();
    ws.joinSession(sessionId, role, userId);
    set({ sessionId, role, userId: userId ?? null });
  },

  leaveSession: () => {
    const ws = initNativeWSClient();
    ws.leaveSession();
    set({ sessionId: null, role: null });
  },

  retryConnection: () => {
    const ws = initNativeWSClient();
    set({ connectionState: "reconnecting" as const, reconnectAttempt: 0 });
    ws.resetAndReconnect();
  },
});
