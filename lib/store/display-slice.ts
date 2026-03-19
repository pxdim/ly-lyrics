/**
 * Display Slice — 顯示設定、控制模式、UI 狀態
 *
 * 負責管理顯示參數（字體大小、行數、主題等）、
 * 控制模式（手動/自動）以及通用 UI 狀態（loading、error）。
 */

import { initNativeWSClient } from "../websocket/native-client";
import type { DisplaySettings } from "../websocket/types";
import type {
  DisplaySliceState,
  DisplaySliceActions,
  SliceCreator,
} from "./types";

type DisplaySlice = DisplaySliceState & DisplaySliceActions;

/** 預設顯示設定（也用於 persist partialize 與測試） */
export const defaultDisplaySettings: DisplaySettings = {
  displayLines: 4,
  fontSize: 32,
  fontFamily: "Inter",
  lineSpacing: 0.5,
  theme: "dark",
  showBackground: true,
  backgroundColor: "#000000",
  backgroundImage: "",
  textColor: "#ffffff",
  highlightColor: "#0ea5e9",
  autoScroll: true,
  scrollDuration: 300,
  enableAnimation: true,
};

export const createDisplaySlice: SliceCreator<DisplaySlice> = (set, get) => ({
  // 初始狀態
  displaySettings: defaultDisplaySettings,
  controlMode: "manual" as const,
  isLoading: false,
  error: null,

  // 設定操作
  updateDisplaySettings: (settings) => {
    const newSettings = { ...get().displaySettings, ...settings };
    set({ displaySettings: newSettings });

    // Controller 角色同步 WebSocket
    const ws = initNativeWSClient();
    if (get().role === "controller" && ws.isConnected()) {
      ws.updateSettings(settings);
    }
  },

  resetDisplaySettings: () => {
    set({ displaySettings: defaultDisplaySettings });

    // Controller 角色同步 WebSocket
    const ws = initNativeWSClient();
    if (get().role === "controller" && ws.isConnected()) {
      ws.updateSettings(defaultDisplaySettings);
    }
  },

  // 控制模式操作
  setControlMode: (mode) => {
    set({ controlMode: mode });
  },

  // UI 狀態操作
  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
});
