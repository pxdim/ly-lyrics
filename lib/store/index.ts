/**
 * Zustand Store for LY Lyrics Display System
 *
 * Centralized state management using Zustand with
 * WebSocket integration for real-time synchronization.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {
  Song,
  SessionState,
  DisplaySettings,
  ClientRole,
} from "../websocket/types";
import type {
  AiTrackingState,
  AiTrackingSettings,
  AiTrackingStatus,
  AudioInputState,
} from "@/types";
import { initNativeWSClient } from "../websocket/native-client";

// ============================================================================
// Types
// ============================================================================

export interface LyricsState {
  // Current song and lyrics
  currentSong: Song | null;
  currentIndex: number;
  lyrics: string[];

  // Connection state
  connectionState: "connected" | "reconnecting" | "disconnected";
  reconnectAttempt: number;
  sessionId: string | null;
  role: ClientRole | null;
  userId: string | null;

  // Device counts
  controllerCount: number;
  displayCount: number;

  // Display settings
  displaySettings: DisplaySettings;

  // Playback state
  isPlaying: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;

  // AI Tracking
  aiTracking: AiTrackingState;
  aiSettings: AiTrackingSettings;
  audioInput: AudioInputState;
}

export interface LyricsActions {
  // Song actions
  setCurrentSong: (song: Song | null) => void;
  setLyrics: (lyrics: string[]) => void;
  setCurrentIndex: (index: number) => void;

  // Navigation
  nextLine: () => void;
  prevLine: () => void;
  jumpToLine: (index: number) => void;

  // Connection actions
  connect: () => void;
  disconnect: () => void;
  joinSession: (sessionId: string, role: ClientRole, userId?: string) => void;
  leaveSession: () => void;

  // Connection state (computed)
  retryConnection: () => void;

  // Settings actions
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  resetDisplaySettings: () => void;

  // Playback actions
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;

  // UI state actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // AI Tracking actions
  startAiTracking: () => void;
  stopAiTracking: () => void;
  updateAiStatus: (status: AiTrackingStatus, confidence?: number, matchedLine?: number) => void;
  triggerManualOverride: () => void;
  updateAudioInput: (partial: Partial<AudioInputState>) => void;
  updateAiSettings: (partial: Partial<AiTrackingSettings>) => void;
}

// ============================================================================
// Default Settings
// ============================================================================

const defaultDisplaySettings: DisplaySettings = {
  displayLines: 4,
  fontSize: 32,
  fontFamily: "Inter",
  theme: "dark",
  showBackground: true,
  backgroundColor: "#000000",
  textColor: "#ffffff",
  highlightColor: "#0ea5e9",
  autoScroll: true,
  scrollDuration: 300,
  enableAnimation: true,
};

// ============================================================================
// Store Creation
// ============================================================================

type LyricsStore = LyricsState & LyricsActions;

export const useLyricsStore = create<LyricsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ========================================
        // Initial State
        // ========================================
        currentSong: null,
        currentIndex: 0,
        lyrics: [],
        connectionState: "disconnected" as const,
        reconnectAttempt: 0,
        sessionId: null,
        role: null,
        userId: null,
        controllerCount: 0,
        displayCount: 0,
        displaySettings: defaultDisplaySettings,
        isPlaying: false,
        isLoading: false,
        error: null,

        // AI Tracking
        aiTracking: {
          isActive: false,
          status: "idle" as const,
          confidence: 0,
          lastMatchedLine: null,
          cooldownUntil: null,
          sttProvider: "deepgram" as const,
          errorMessage: null,
        },
        aiSettings: {
          sttProvider: "deepgram" as const,
          apiKey: null,
          confidenceThreshold: 0.6,
          windowBefore: 2,
          windowAfter: 3,
          manualOverrideCooldown: 5000,
          fullScanThreshold: 0.8,
        },
        audioInput: {
          deviceId: null,
          gain: 0,
          volume: 0,
          isCapturing: false,
        },

        // ========================================
        // Song Actions
        // ========================================
        setCurrentSong: (song) => {
          set({
            currentSong: song,
            currentIndex: 0,
            lyrics: song?.lyrics ?? [],
          });

          // Controller 選歌時透過 WebSocket 通知後端，後端會廣播 song_changed 給所有 Display
          const ws = initNativeWSClient();
          if (get().role === "controller" && ws.isConnected()) {
            if (song) {
              ws.setSong(song.id);
            }
          }
        },

        setLyrics: (lyrics) => {
          set({ lyrics, currentIndex: 0 });
        },

        setCurrentIndex: (index) => {
          const { lyrics } = get();
          if (lyrics.length === 0) return;
          const clampedIndex = Math.max(0, Math.min(index, lyrics.length - 1));
          set({ currentIndex: clampedIndex });
        },

        // ========================================
        // Navigation Actions
        // ========================================
        nextLine: () => {
          const { currentIndex, lyrics } = get();
          if (lyrics.length === 0) return;
          const nextIndex = Math.min(currentIndex + 1, lyrics.length - 1);
          set({ currentIndex: nextIndex });

          // Send to WebSocket if connected as controller
          const ws = initNativeWSClient();
          if (get().role === "controller" && ws.isConnected()) {
            ws.nextLine();
          }
        },

        prevLine: () => {
          const { currentIndex } = get();
          const prevIndex = Math.max(currentIndex - 1, 0);
          set({ currentIndex: prevIndex });

          // Send to WebSocket if connected as controller
          const ws = initNativeWSClient();
          if (get().role === "controller" && ws.isConnected()) {
            ws.prevLine();
          }
        },

        jumpToLine: (index) => {
          const { lyrics } = get();
          if (lyrics.length === 0) return;
          const clampedIndex = Math.max(0, Math.min(index, lyrics.length - 1));
          set({ currentIndex: clampedIndex });

          // Send to WebSocket if connected as controller
          const ws = initNativeWSClient();
          if (get().role === "controller" && ws.isConnected()) {
            ws.changeLine(clampedIndex);
          }
        },

        // ========================================
        // Connection Actions
        // ========================================
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

            // 業務事件監聽
            ws.on("line_changed", ({ lineIndex }) => {
              set({ currentIndex: lineIndex });
            });

            ws.on("session_state", (state: SessionState) => {
              set({
                currentIndex: state.currentLineIndex,
                isPlaying: state.isPlaying,
                controllerCount: state.controllerCount,
                displayCount: state.displayCount,
              });
              if (state.currentSong) {
                set({
                  currentSong: state.currentSong,
                  lyrics: state.currentSong.lyrics ?? [],
                });
              }
            });

            ws.on("song_changed", ({ song }) => {
              set({
                currentSong: song,
                currentIndex: 0,
                lyrics: song?.lyrics ?? [],
              });
            });

            ws.on("settings_updated", ({ settings }) => {
              set({ displaySettings: settings });
            });

            ws.on("playing_changed", ({ isPlaying }) => {
              set({ isPlaying });
            });

            ws.on("client_joined", ({ controllerCount, displayCount }) => {
              set({ controllerCount, displayCount });
            });

            ws.on("client_left", ({ controllerCount, displayCount }) => {
              set({ controllerCount, displayCount });
            });

            ws.on("error", ({ message }) => {
              set({ error: message });
            });

            // 如果 WebSocket 已經連上（singleton 可能已經在連線中），立即同步狀態
            if (ws.isConnected()) {
              set({ connectionState: "connected", reconnectAttempt: 0 });
            }
          } catch (error) {
            console.error("Failed to connect to WebSocket:", error);
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

        // ========================================
        // Settings Actions
        // ========================================
        updateDisplaySettings: (settings) => {
          const newSettings = { ...get().displaySettings, ...settings };
          set({ displaySettings: newSettings });

          // Send to WebSocket if connected as controller
          const ws = initNativeWSClient();
          if (get().role === "controller" && ws.isConnected()) {
            ws.updateSettings(settings);
          }
        },

        resetDisplaySettings: () => {
          set({ displaySettings: defaultDisplaySettings });

          // Send to WebSocket if connected as controller
          const ws = initNativeWSClient();
          if (get().role === "controller" && ws.isConnected()) {
            ws.updateSettings(defaultDisplaySettings);
          }
        },

        // ========================================
        // Playback Actions
        // ========================================
        setPlaying: (playing) => {
          set({ isPlaying: playing });

          // Send to WebSocket if connected as controller
          const ws = initNativeWSClient();
          if (get().role === "controller" && ws.isConnected()) {
            ws.setPlaying(playing);
          }
        },

        togglePlaying: () => {
          const { isPlaying } = get();
          set({ isPlaying: !isPlaying });

          // Send to WebSocket if connected as controller
          const ws = initNativeWSClient();
          if (get().role === "controller" && ws.isConnected()) {
            ws.setPlaying(!isPlaying);
          }
        },

        // ========================================
        // AI Tracking Actions
        // ========================================
        startAiTracking: () => {
          set({
            aiTracking: {
              ...get().aiTracking,
              isActive: true,
              status: "listening",
              errorMessage: null,
            },
          });
        },

        stopAiTracking: () => {
          set({
            aiTracking: {
              isActive: false,
              status: "idle",
              confidence: 0,
              lastMatchedLine: null,
              cooldownUntil: null,
              sttProvider: get().aiSettings.sttProvider,
              errorMessage: null,
            },
          });
        },

        updateAiStatus: (status, confidence, matchedLine) => {
          set({
            aiTracking: {
              ...get().aiTracking,
              status,
              ...(confidence !== undefined && { confidence }),
              ...(matchedLine !== undefined && { lastMatchedLine: matchedLine }),
            },
          });
        },

        triggerManualOverride: () => {
          const cooldown = get().aiSettings.manualOverrideCooldown;
          set({
            aiTracking: {
              ...get().aiTracking,
              status: "cooldown",
              cooldownUntil: Date.now() + cooldown,
            },
          });
        },

        updateAudioInput: (partial) => {
          set({
            audioInput: { ...get().audioInput, ...partial },
          });
        },

        updateAiSettings: (partial) => {
          set({
            aiSettings: { ...get().aiSettings, ...partial },
          });
        },

        // ========================================
        // UI State Actions
        // ========================================
        setLoading: (loading) => {
          set({ isLoading: loading });
        },

        setError: (error) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: "lyrics-store",
        partialize: (state) => ({
          displaySettings: state.displaySettings,
          role: state.role,
          userId: state.userId,
          aiSettings: state.aiSettings,
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
 * Get visible lyrics based on current index and display lines setting
 */
export const selectVisibleLyrics = (state: LyricsState) => {
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
 * Get connection status summary
 */
export const selectConnectionStatus = (state: LyricsState) => {
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
 * Get navigation state
 */
export const selectNavigationState = (state: LyricsState) => {
  return {
    currentIndex: state.currentIndex,
    totalLines: state.lyrics.length,
    canGoNext: state.currentIndex < state.lyrics.length - 1,
    canGoPrev: state.currentIndex > 0,
    isPlaying: state.isPlaying,
  };
};
