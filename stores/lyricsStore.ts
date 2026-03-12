import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Song,
  DisplaySettings,
  ConnectionStatus,
  ConnectionState,
  AiListeningState,
} from "@/types";
import { DEFAULT_DISPLAY_SETTINGS } from "@/types";

/**
 * Main Lyrics Store
 * Manages global application state for lyrics display
 */

interface LyricsStore {
  // ==================== State ====================

  // Current Song
  currentSong: Song | null;
  currentLineIndex: number;

  // Display Settings
  displaySettings: DisplaySettings;

  // Connection
  connectionState: ConnectionState;
  sessionCode: string | null;

  // AI Listening
  aiListeningState: AiListeningState;

  // UI State
  isLoading: boolean;
  error: string | null;

  // ==================== Actions ====================

  // Song Actions
  setCurrentSong: (song: Song | null) => void;
  nextLine: () => void;
  prevLine: () => void;
  jumpToLine: (index: number) => void;
  resetLineIndex: () => void;

  // Display Settings Actions
  updateDisplaySettings: (
    settings: Partial<DisplaySettings>,
  ) => void;
  resetDisplaySettings: () => void;
  setDisplayLines: (count: number) => void;
  setTheme: (theme: "light" | "dark" | "auto") => void;

  // Connection Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSessionCode: (code: string | null) => void;
  setConnectedDisplays: (count: number) => void;
  setIsController: (isController: boolean) => void;

  // AI Actions
  toggleAiListening: () => void;
  setAiListening: (isActive: boolean) => void;
  setAiConfidence: (confidence: number) => void;
  setAiMatchedLine: (lineIndex: number | null) => void;

  // UI Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset
  reset: () => void;
}

export const useLyricsStore = create<LyricsStore>()(
  persist(
    (set) => ({
      // ==================== Initial State ====================

      currentSong: null,
      currentLineIndex: 0,

      displaySettings: DEFAULT_DISPLAY_SETTINGS,

      connectionState: {
        status: "disconnected",
        sessionId: null,
        connectedDisplays: 0,
        isController: false,
      },

      sessionCode: null,

      aiListeningState: {
        isActive: false,
        confidence: 0,
        lastMatchedLine: null,
        lastUpdateTime: new Date(),
        apiProvider: "gemini",
      },

      isLoading: false,
      error: null,

      // ==================== Song Actions ====================

      setCurrentSong: (song) =>
        set({
          currentSong: song,
          currentLineIndex: 0,
        }),

      nextLine: () =>
        set((state) => {
          const maxIndex =
            state.currentSong?.lyrics.length
              ? state.currentSong.lyrics.length - 1
              : 0;
          return {
            currentLineIndex: Math.min(maxIndex, state.currentLineIndex + 1),
          };
        }),

      prevLine: () =>
        set((state) => ({
          currentLineIndex: Math.max(0, state.currentLineIndex - 1),
        })),

      jumpToLine: (index) =>
        set((state) => {
          const maxIndex =
            state.currentSong?.lyrics.length
              ? state.currentSong.lyrics.length - 1
              : 0;
          return {
            currentLineIndex: Math.min(
              maxIndex,
              Math.max(0, index),
            ),
          };
        }),

      resetLineIndex: () => set({ currentLineIndex: 0 }),

      // ==================== Display Settings Actions ====================

      updateDisplaySettings: (settings) =>
        set((state) => ({
          displaySettings: {
            ...state.displaySettings,
            ...settings,
          },
        })),

      resetDisplaySettings: () =>
        set({
          displaySettings: DEFAULT_DISPLAY_SETTINGS,
        }),

      setDisplayLines: (count) =>
        set((state) => ({
          displaySettings: {
            ...state.displaySettings,
            displayLines: Math.min(10, Math.max(1, count)),
          },
        })),

      setTheme: (theme) =>
        set((state) => ({
          displaySettings: {
            ...state.displaySettings,
            theme,
          },
        })),

      // ==================== Connection Actions ====================

      setConnectionStatus: (status) =>
        set((state) => ({
          connectionState: {
            ...state.connectionState,
            status,
          },
        })),

      setSessionCode: (code) => set({ sessionCode: code }),

      setConnectedDisplays: (count) =>
        set((state) => ({
          connectionState: {
            ...state.connectionState,
            connectedDisplays: count,
          },
        })),

      setIsController: (isController) =>
        set((state) => ({
          connectionState: {
            ...state.connectionState,
            isController,
          },
        })),

      // ==================== AI Actions ====================

      toggleAiListening: () =>
        set((state) => ({
          aiListeningState: {
            ...state.aiListeningState,
            isActive: !state.aiListeningState.isActive,
          },
        })),

      setAiListening: (isActive) =>
        set((state) => ({
          aiListeningState: {
            ...state.aiListeningState,
            isActive,
          },
        })),

      setAiConfidence: (confidence) =>
        set((state) => ({
          aiListeningState: {
            ...state.aiListeningState,
            confidence: Math.max(0, Math.min(1, confidence)),
          },
        })),

      setAiMatchedLine: (lineIndex) =>
        set((state) => ({
          aiListeningState: {
            ...state.aiListeningState,
            lastMatchedLine: lineIndex,
            lastUpdateTime: new Date(),
          },
        })),

      // ==================== UI Actions ====================

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // ==================== Reset ====================

      reset: () =>
        set({
          currentSong: null,
          currentLineIndex: 0,
          displaySettings: DEFAULT_DISPLAY_SETTINGS,
          connectionState: {
            status: "disconnected",
            sessionId: null,
            connectedDisplays: 0,
            isController: false,
          },
          sessionCode: null,
          aiListeningState: {
            isActive: false,
            confidence: 0,
            lastMatchedLine: null,
            lastUpdateTime: new Date(),
            apiProvider: "gemini",
          },
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: "lyrics-storage",
      // Persist only specific fields
      partialize: (state) => ({
        displaySettings: state.displaySettings,
        sessionCode: state.sessionCode,
      }),
    },
  ),
);

// ==================== Selectors ====================

/**
 * Get current lyrics lines for display
 */
export const selectDisplayLines = (state: LyricsStore) => {
  const { currentSong, currentLineIndex, displaySettings } = state;
  const lyrics = currentSong?.lyrics ?? [];
  const displayLines = displaySettings.displayLines;

  const half = Math.floor(displayLines / 2);
  const start = Math.max(0, currentLineIndex - half);
  const end = Math.min(lyrics.length, start + displayLines);

  return {
    lines: lyrics.slice(start, end),
    startIndex: start,
    endIndex: end - 1,
  };
};

/**
 * Check if at first line
 */
export const selectIsAtFirstLine = (state: LyricsStore) =>
  state.currentLineIndex === 0;

/**
 * Check if at last line
 */
export const selectIsAtLastLine = (state: LyricsStore) => {
  const { currentSong, currentLineIndex } = state;
  const maxIndex = currentSong?.lyrics.length
    ? currentSong.lyrics.length - 1
    : 0;
  return currentLineIndex >= maxIndex;
};

/**
 * Get connection status as boolean
 */
export const selectIsConnected = (state: LyricsStore) =>
  state.connectionState.status === "connected";
