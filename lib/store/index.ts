/**
 * Zustand Store for LY Lyrics Display System
 *
 * 使用 slice pattern 將狀態管理拆分為獨立模組，
 * 透過組合模式（compose）建立統一的 store。
 *
 * Slice 架構：
 * - lyrics-slice: 歌曲、歌詞、導航、播放
 * - websocket-slice: WebSocket 連線、session、事件監聽
 * - display-slice: 顯示設定、控制模式、UI 狀態
 * - ai-tracking-slice: AI 追蹤、音訊輸入、AI 設定
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

import { createLyricsSlice } from "./lyrics-slice";
import { createWebSocketSlice } from "./websocket-slice";
import { createDisplaySlice } from "./display-slice";
import { createAiTrackingSlice } from "./ai-tracking-slice";
import type { LyricsStore, LyricsStoreState } from "./types";

// 重新匯出型別，保持向後相容
export type { LyricsStore };

/** 向後相容：原有的 LyricsState 型別別名 */
export type LyricsState = LyricsStoreState;

/** 向後相容：原有的 LyricsActions 型別別名 */
export type LyricsActions = Omit<LyricsStore, keyof LyricsStoreState>;

// ============================================================================
// Store 建立：組合所有 Slices
// ============================================================================

export const useLyricsStore = create<LyricsStore>()(
  devtools(
    persist(
      (...a) => ({
        ...createLyricsSlice(...a),
        ...createWebSocketSlice(...a),
        ...createDisplaySlice(...a),
        ...createAiTrackingSlice(...a),
      }),
      {
        name: "lyrics-store",
        partialize: (state) => ({
          displaySettings: state.displaySettings,
          role: state.role,
          userId: state.userId,
          aiSettings: { ...state.aiSettings, apiKey: null },
          controlMode: state.controlMode,
        }),
        // Required for Next.js App Router: prevents persist from calling set()
        // during SSR (server-side rendering), which causes React error #185.
        // Rehydration is done manually in StoreHydration component.
        skipHydration: true,
      }
    ),
    { name: "LyricsStore", enabled: process.env["NODE_ENV"] === "development" }
  )
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * 取得可見歌詞窗口（根據目前行號和顯示行數設定）
 */
export const selectVisibleLyrics = (state: LyricsStoreState) => {
  const { lyrics, currentIndex, displaySettings } = state;
  const { displayLines } = displaySettings;

  // 前瞻偏移：少行數時當前句置頂，多行數時保留少量上文
  const prevLines = Math.floor(displayLines / 3);
  const startIndex = Math.max(0, currentIndex - prevLines);
  const endIndex = Math.min(lyrics.length, startIndex + displayLines);

  return {
    visibleLyrics: lyrics.slice(startIndex, endIndex),
    startIndex,
    endIndex,
    highlightIndex: currentIndex - startIndex,
  };
};

/**
 * 取得連線狀態摘要
 */
export const selectConnectionStatus = (state: LyricsStoreState) => {
  return {
    isConnected: state.connectionState === "connected",
    connectionState: state.connectionState,
    reconnectAttempt: state.reconnectAttempt,
    isInSession: state.sessionId !== null,
    role: state.role,
    controllerCount: state.controllerCount,
    displayCount: state.displayCount,
  };
};

/**
 * 取得導航狀態
 */
export const selectNavigationState = (state: LyricsStoreState) => {
  return {
    currentIndex: state.currentIndex,
    totalLines: state.lyrics.length,
    canGoNext: state.currentIndex < state.lyrics.length - 1,
    canGoPrev: state.currentIndex > 0,
    isPlaying: state.isPlaying,
  };
};
