/**
 * usePlaylistReorder hook 測試
 *
 * 測試播放列表重新排序的 optimistic update 與 API 呼叫邏輯。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlaylistReorder } from "./usePlaylistReorder";
import type { ClientSong } from "@/lib/api/songs";
import type { ClientPlaylist } from "@/lib/api/playlists";

// Mock updatePlaylist API
vi.mock("@/lib/api/playlists", () => ({
  updatePlaylist: vi.fn(),
}));

import { updatePlaylist } from "@/lib/api/playlists";

const mockUpdatePlaylist = vi.mocked(updatePlaylist);

// ============================================================================
// 測試輔助
// ============================================================================

function createSong(id: string, title: string): ClientSong {
  return {
    id,
    title,
    lyrics: ["歌詞"],
    userId: "u1",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  };
}

const playlist: ClientPlaylist = {
  id: "pl-1",
  name: "我的清單",
  songIds: ["s1", "s2", "s3"],
  userId: "u1",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

const allSongs: ClientSong[] = [
  createSong("s1", "歌曲一"),
  createSong("s2", "歌曲二"),
  createSong("s3", "歌曲三"),
];

describe("usePlaylistReorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns resolved songs in playlist order", () => {
    const setPlaylist = vi.fn();
    const { result } = renderHook(() =>
      usePlaylistReorder({ playlist, allSongs, setPlaylist })
    );

    expect(result.current.orderedSongs.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("filters out songs not found in allSongs", () => {
    const playlistWithMissing: ClientPlaylist = {
      ...playlist,
      songIds: ["s1", "unknown-id", "s3"],
    };
    const setPlaylist = vi.fn();
    const { result } = renderHook(() =>
      usePlaylistReorder({ playlist: playlistWithMissing, allSongs, setPlaylist })
    );

    expect(result.current.orderedSongs.map((s) => s.id)).toEqual(["s1", "s3"]);
  });

  it("calls updatePlaylist API with new songIds on reorder", async () => {
    const updatedPlaylist: ClientPlaylist = {
      ...playlist,
      songIds: ["s2", "s3", "s1"],
    };
    mockUpdatePlaylist.mockResolvedValue(updatedPlaylist);

    const setPlaylist = vi.fn();
    const { result } = renderHook(() =>
      usePlaylistReorder({ playlist, allSongs, setPlaylist })
    );

    const reorderedSongs = [allSongs[1]!, allSongs[2]!, allSongs[0]!]; // s2, s3, s1

    await act(async () => {
      result.current.handleReorder(reorderedSongs);
    });

    expect(mockUpdatePlaylist).toHaveBeenCalledWith("pl-1", {
      songIds: ["s2", "s3", "s1"],
    });
  });

  it("applies optimistic update before API response", () => {
    // API 永不 resolve（模擬 pending 狀態）
    mockUpdatePlaylist.mockReturnValue(new Promise(() => {}));

    const setPlaylist = vi.fn();
    const { result } = renderHook(() =>
      usePlaylistReorder({ playlist, allSongs, setPlaylist })
    );

    const reorderedSongs = [allSongs[1]!, allSongs[2]!, allSongs[0]!];

    act(() => {
      result.current.handleReorder(reorderedSongs);
    });

    // setPlaylist 應在 API 呼叫前就被呼叫（optimistic update）
    expect(setPlaylist).toHaveBeenCalledWith({
      ...playlist,
      songIds: ["s2", "s3", "s1"],
    });
  });

  it("rolls back on API failure", async () => {
    mockUpdatePlaylist.mockRejectedValue(new Error("API 錯誤"));

    const setPlaylist = vi.fn();
    const { result } = renderHook(() =>
      usePlaylistReorder({ playlist, allSongs, setPlaylist })
    );

    const reorderedSongs = [allSongs[1]!, allSongs[2]!, allSongs[0]!];

    await act(async () => {
      result.current.handleReorder(reorderedSongs);
    });

    // 第一次呼叫：optimistic update
    // 第二次呼叫：rollback 回原始順序
    expect(setPlaylist).toHaveBeenCalledTimes(2);
    expect(setPlaylist).toHaveBeenNthCalledWith(1, {
      ...playlist,
      songIds: ["s2", "s3", "s1"],
    });
    expect(setPlaylist).toHaveBeenNthCalledWith(2, playlist);
  });

  it("returns empty orderedSongs when playlist is null", () => {
    const setPlaylist = vi.fn();
    const { result } = renderHook(() =>
      usePlaylistReorder({ playlist: null, allSongs, setPlaylist })
    );

    expect(result.current.orderedSongs).toEqual([]);
  });
});
