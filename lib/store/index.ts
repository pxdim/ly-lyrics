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
  isConnected: boolean;
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
        isConnected: false,
        sessionId: null,
        role: null,
        userId: null,
        controllerCount: 0,
        displayCount: 0,
        displaySettings: defaultDisplaySettings,
        isPlaying: false,
        isLoading: false,
        error: null,

        // ========================================
        // Song Actions
        // ========================================
        setCurrentSong: (song) => {
          set({ currentSong: song, currentIndex: 0 });
          if (song?.lyrics) {
            set({ lyrics: song.lyrics });
          }
        },

        setLyrics: (lyrics) => {
          set({ lyrics, currentIndex: 0 });
        },

        setCurrentIndex: (index) => {
          const { lyrics } = get();
          const clampedIndex = Math.max(0, Math.min(index, lyrics.length - 1));
          set({ currentIndex: clampedIndex });
        },

        // ========================================
        // Navigation Actions
        // ========================================
        nextLine: () => {
          const { currentIndex, lyrics } = get();
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

            // Set up event listeners
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
                  lyrics: state.currentSong.lyrics,
                });
              }
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

            set({ isConnected: true });
          } catch (error) {
            console.error("Failed to connect to WebSocket:", error);
            set({
              error: error instanceof Error ? error.message : "Connection failed",
            });
          }
        },

        disconnect: () => {
          const ws = initNativeWSClient();
          ws.disconnect();
          set({
            isConnected: false,
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

  const halfLines = Math.floor(displayLines / 2);
  const startIndex = Math.max(0, currentIndex - halfLines);
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
    isConnected: state.isConnected,
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
