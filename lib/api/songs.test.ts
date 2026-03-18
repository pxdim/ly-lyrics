/**
 * Song API 客戶端單元測試
 *
 * 覆蓋範圍：fetchSongs / fetchSongById / createSong / updateSong / deleteSong
 * 各函式的 HTTP method、URL、query params、request body、
 * 成功回應解析、錯誤處理（JSON 錯誤訊息 / 非 JSON fallback）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchSongs,
  fetchSongById,
  createSong,
  updateSong,
  deleteSong,
} from "./songs";
import type { ClientSong, SongListResult } from "./songs";

// ============================================================================
// Mock fetch
// ============================================================================

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// 測試輔助
// ============================================================================

function createMockSong(overrides: Partial<ClientSong> = {}): ClientSong {
  return {
    id: "song-1",
    title: "Amazing Grace",
    artist: "John Newton",
    lyrics: ["Amazing grace", "How sweet the sound"],
    language: "en",
    userId: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function createMockListResult(
  overrides: Partial<SongListResult> = {},
): SongListResult {
  return {
    data: [createMockSong()],
    total: 1,
    limit: 20,
    offset: 0,
    ...overrides,
  };
}

// ============================================================================
// fetchSongs
// ============================================================================

describe("fetchSongs", () => {
  it("sends GET request to /api/songs without params", async () => {
    const mockResult = createMockListResult();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    const result = await fetchSongs();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe("/api/songs");
    expect(result).toEqual(mockResult);
  });

  it("appends query params when limit, offset, and search are provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockListResult()),
    });

    await fetchSongs({ limit: 10, offset: 20, search: "grace" });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("/api/songs?");
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=20");
    expect(url).toContain("search=grace");
  });

  it("omits undefined params from query string", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockListResult()),
    });

    await fetchSongs({ limit: 5 });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("limit=5");
    expect(url).not.toContain("offset");
    expect(url).not.toContain("search");
  });

  it("throws error with server message when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: "Internal server error" }),
    });

    await expect(fetchSongs()).rejects.toThrow("Internal server error");
  });

  it("throws fallback error when error response is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(fetchSongs()).rejects.toThrow("Failed to fetch songs");
  });

  it("propagates network error from fetch", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(fetchSongs()).rejects.toThrow("Failed to fetch");
  });
});

// ============================================================================
// fetchSongById
// ============================================================================

describe("fetchSongById", () => {
  it("sends GET request to /api/songs/:id", async () => {
    const mockSong = createMockSong({ id: "song-42" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSong),
    });

    const result = await fetchSongById("song-42");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe("/api/songs/song-42");
    expect(result).toEqual(mockSong);
  });

  it("encodes special characters in song id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockSong()),
    });

    await fetchSongById("id/with spaces");

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe("/api/songs/id%2Fwith%20spaces");
  });

  it("throws error with server message when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Song not found" }),
    });

    await expect(fetchSongById("nonexistent")).rejects.toThrow(
      "Song not found",
    );
  });

  it("throws fallback error when error response is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("parse error")),
    });

    await expect(fetchSongById("song-1")).rejects.toThrow(
      "Failed to fetch song",
    );
  });
});

// ============================================================================
// createSong
// ============================================================================

describe("createSong", () => {
  it("sends POST request to /api/songs with correct headers and body", async () => {
    const mockSong = createMockSong();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSong),
    });

    const payload = {
      title: "Amazing Grace",
      artist: "John Newton",
      lyrics: ["Amazing grace", "How sweet the sound"],
      language: "en",
    };

    const result = await createSong(payload);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/songs");
    expect(options.method).toBe("POST");
    expect(
      (options.headers as Record<string, string>)["Content-Type"],
    ).toBe("application/json");
    expect(JSON.parse(options.body as string)).toEqual(payload);
    expect(result).toEqual(mockSong);
  });

  it("sends POST with optional lrcTimestamps", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockSong()),
    });

    const payload = {
      title: "Test",
      lyrics: ["Line 1"],
      lrcTimestamps: [0, 3000],
    };

    await createSong(payload);

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.lrcTimestamps).toEqual([0, 3000]);
  });

  it("throws error with server message when creation fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: "Title is required" }),
    });

    await expect(
      createSong({ title: "", lyrics: [] }),
    ).rejects.toThrow("Title is required");
  });

  it("throws fallback error when error response is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(
      createSong({ title: "Test", lyrics: [] }),
    ).rejects.toThrow("建立歌曲失敗");
  });
});

// ============================================================================
// updateSong
// ============================================================================

describe("updateSong", () => {
  it("sends PUT request to /api/songs/:id with partial update data", async () => {
    const mockSong = createMockSong({ title: "Updated Title" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSong),
    });

    const result = await updateSong("song-1", { title: "Updated Title" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/songs/song-1");
    expect(options.method).toBe("PUT");
    expect(
      (options.headers as Record<string, string>)["Content-Type"],
    ).toBe("application/json");
    expect(JSON.parse(options.body as string)).toEqual({
      title: "Updated Title",
    });
    expect(result).toEqual(mockSong);
  });

  it("encodes special characters in song id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockSong()),
    });

    await updateSong("id/special", { title: "New" });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe("/api/songs/id%2Fspecial");
  });

  it("throws error with server message when update fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Song not found" }),
    });

    await expect(
      updateSong("nonexistent", { title: "X" }),
    ).rejects.toThrow("Song not found");
  });

  it("throws fallback error when error response is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("bad json")),
    });

    await expect(
      updateSong("song-1", { title: "X" }),
    ).rejects.toThrow("更新歌曲失敗");
  });
});

// ============================================================================
// deleteSong
// ============================================================================

describe("deleteSong", () => {
  it("sends DELETE request to /api/songs/:id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    await deleteSong("song-1");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/songs/song-1");
    expect(options.method).toBe("DELETE");
  });

  it("encodes special characters in song id", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await deleteSong("id with/slash");

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe("/api/songs/id%20with%2Fslash");
  });

  it("resolves to undefined on success", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await deleteSong("song-1");

    expect(result).toBeUndefined();
  });

  it("throws error with server message when deletion fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ message: "Permission denied" }),
    });

    await expect(deleteSong("song-1")).rejects.toThrow("Permission denied");
  });

  it("throws fallback error when error response is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(deleteSong("song-1")).rejects.toThrow("刪除歌曲失敗");
  });
});
