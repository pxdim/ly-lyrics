/**
 * Zustand Store 共用型別定義
 *
 * 集中管理 store 的 state 與 actions 型別，
 * 供各 slice 及 index.ts 共用。
 */

import type { StateCreator } from "zustand";
import type {
  Song,
  DisplaySettings,
  ClientRole,
} from "../websocket/types";
import type {
  AiTrackingState,
  AiTrackingSettings,
  AiTrackingStatus,
  AudioInputState,
} from "@/types";

// ============================================================================
// Slice State 型別
// ============================================================================

export interface LyricsSliceState {
  // 當前歌曲與歌詞
  currentSong: Song | null;
  currentIndex: number;
  lyrics: string[];

  // 播放狀態
  isPlaying: boolean;
}

export interface LyricsSliceActions {
  // 歌曲操作
  setCurrentSong: (song: Song | null) => void;
  setLyrics: (lyrics: string[]) => void;
  setCurrentIndex: (index: number) => void;

  // 導航
  nextLine: () => void;
  prevLine: () => void;
  jumpToLine: (index: number) => void;

  // 播放操作
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
}

export interface WebSocketSliceState {
  // 連線狀態
  connectionState: "connected" | "reconnecting" | "disconnected";
  reconnectAttempt: number;
  sessionId: string | null;
  role: ClientRole | null;
  userId: string | null;

  // 裝置計數
  controllerCount: number;
  displayCount: number;
}

export interface WebSocketSliceActions {
  // 連線操作
  connect: () => void;
  disconnect: () => void;
  joinSession: (sessionId: string, role: ClientRole, userId?: string) => void;
  leaveSession: () => void;
  retryConnection: () => void;
}

export interface DisplaySliceState {
  // 顯示設定
  displaySettings: DisplaySettings;

  // 控制模式 (FR6.4)
  controlMode: "auto" | "manual";

  // UI 狀態
  isLoading: boolean;
  error: string | null;
}

export interface DisplaySliceActions {
  // 設定操作
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  resetDisplaySettings: () => void;

  // 控制模式操作
  setControlMode: (mode: "auto" | "manual") => void;

  // UI 狀態操作
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export interface AiTrackingSliceState {
  aiTracking: AiTrackingState;
  aiSettings: AiTrackingSettings;
  audioInput: AudioInputState;
}

export interface AiTrackingSliceActions {
  startAiTracking: () => void;
  stopAiTracking: () => void;
  updateAiStatus: (status: AiTrackingStatus, confidence?: number, matchedLine?: number, errorMessage?: string | null) => void;
  updateAiTranscript: (text: string, isFinal: boolean) => void;
  triggerManualOverride: () => void;
  updateAudioInput: (partial: Partial<AudioInputState>) => void;
  updateAiSettings: (partial: Partial<AiTrackingSettings>) => void;
}

// ============================================================================
// 組合型別
// ============================================================================

/** 完整 store state（所有 slice 組合） */
export type LyricsStoreState =
  LyricsSliceState &
  WebSocketSliceState &
  DisplaySliceState &
  AiTrackingSliceState;

/** 完整 store actions（所有 slice 組合） */
export type LyricsStoreActions =
  LyricsSliceActions &
  WebSocketSliceActions &
  DisplaySliceActions &
  AiTrackingSliceActions;

/** 完整 store 型別 */
export type LyricsStore = LyricsStoreState & LyricsStoreActions;

/** Slice creator 型別：各 slice 可存取完整 store */
export type SliceCreator<T> = StateCreator<
  LyricsStore,
  [["zustand/devtools", never], ["zustand/persist", unknown]],
  [],
  T
>;
