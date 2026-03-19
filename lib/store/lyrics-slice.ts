/**
 * Lyrics Slice — 歌曲、歌詞、導航、播放狀態
 *
 * 負責管理當前歌曲選擇、歌詞內容、行號導航與播放控制。
 * Controller 角色的操作會透過 WebSocket 同步給其他客戶端。
 */

import { initNativeWSClient } from "../websocket/native-client";
import type {
  LyricsSliceState,
  LyricsSliceActions,
  SliceCreator,
} from "./types";

type LyricsSlice = LyricsSliceState & LyricsSliceActions;

export const createLyricsSlice: SliceCreator<LyricsSlice> = (set, get) => ({
  // 初始狀態
  currentSong: null,
  currentIndex: 0,
  lyrics: [],
  isPlaying: false,

  // 歌曲操作
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

  // 導航操作
  nextLine: () => {
    const { currentIndex, lyrics } = get();
    if (lyrics.length === 0) return;
    const nextIndex = Math.min(currentIndex + 1, lyrics.length - 1);
    set({ currentIndex: nextIndex });

    // Controller 角色同步 WebSocket
    const ws = initNativeWSClient();
    if (get().role === "controller" && ws.isConnected()) {
      ws.nextLine();
    }
  },

  prevLine: () => {
    const { currentIndex } = get();
    const prevIndex = Math.max(currentIndex - 1, 0);
    set({ currentIndex: prevIndex });

    // Controller 角色同步 WebSocket
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

    // Controller 角色同步 WebSocket
    const ws = initNativeWSClient();
    if (get().role === "controller" && ws.isConnected()) {
      ws.changeLine(clampedIndex);
    }
  },

  // 播放操作
  setPlaying: (playing) => {
    set({ isPlaying: playing });

    // Controller 角色同步 WebSocket
    const ws = initNativeWSClient();
    if (get().role === "controller" && ws.isConnected()) {
      ws.setPlaying(playing);
    }
  },

  togglePlaying: () => {
    const { isPlaying } = get();
    set({ isPlaying: !isPlaying });

    // Controller 角色同步 WebSocket
    const ws = initNativeWSClient();
    if (get().role === "controller" && ws.isConnected()) {
      ws.setPlaying(!isPlaying);
    }
  },
});
