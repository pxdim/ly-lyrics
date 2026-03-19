/**
 * Lyrics Slice 單元測試
 *
 * 測試 lyrics slice 的 state 初始值與 actions 是否正確建構。
 * 驗證 slice 可獨立於完整 store 運作。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock WebSocket
const mockWs = {
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
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

import { createLyricsSlice } from "./lyrics-slice";
import type { LyricsStore } from "./types";

describe("createLyricsSlice", () => {
  let state: ReturnType<typeof createLyricsSlice>;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // 模擬完整 store 的最小必要狀態
    const storeState: Partial<LyricsStore> = {
      currentSong: null,
      currentIndex: 0,
      lyrics: [],
      isPlaying: false,
      role: null,
    };

    mockSet = vi.fn((partial) => {
      if (typeof partial === "function") {
        const result = partial(storeState);
        Object.assign(storeState, result);
      } else {
        Object.assign(storeState, partial);
      }
    });

    mockGet = vi.fn(() => storeState as LyricsStore);

    state = createLyricsSlice(
      mockSet as unknown as Parameters<typeof createLyricsSlice>[0],
      mockGet as unknown as Parameters<typeof createLyricsSlice>[1],
      {} as Parameters<typeof createLyricsSlice>[2],
    );
  });

  it("應提供正確的初始狀態", () => {
    expect(state.currentSong).toBeNull();
    expect(state.currentIndex).toBe(0);
    expect(state.lyrics).toEqual([]);
    expect(state.isPlaying).toBe(false);
  });

  it("setCurrentSong 應設定歌曲並重置 index", () => {
    const song = {
      id: "s1",
      title: "Test",
      lyrics: ["a", "b"],
      userId: "u1",
      createdAt: "",
      updatedAt: "",
    };

    state.setCurrentSong(song);

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        currentSong: song,
        currentIndex: 0,
        lyrics: ["a", "b"],
      }),
    );
  });

  it("setLyrics 應更新歌詞並重置 index", () => {
    state.setLyrics(["new1", "new2"]);

    expect(mockSet).toHaveBeenCalledWith({ lyrics: ["new1", "new2"], currentIndex: 0 });
  });

  it("nextLine 在空歌詞時不應改變 index", () => {
    state.nextLine();

    // 空歌詞時應提早返回，不呼叫 set
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("togglePlaying 應反轉播放狀態", () => {
    state.togglePlaying();

    expect(mockSet).toHaveBeenCalledWith({ isPlaying: true });
  });
});
