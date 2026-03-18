/**
 * Playlist API 客戶端單元測試
 *
 * 覆蓋範圍：fetchPlaylists / createPlaylist / updatePlaylist / deletePlaylist
 * 各函式的 HTTP method、URL、query params、request body、
 * 成功回應解析、錯誤處理（JSON 錯誤訊息 / 非 JSON fallback）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
} from "./playlists";
import type { ClientPlaylist, PlaylistListResult } from "./playlists";

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

function createMockPlaylist(
  overrides: Partial<ClientPlaylist> = {},
): ClientPlaylist {
  return {
    id: "pl-1",
    name: "Sunday Worship",
    songIds: ["song-1", "song-2"],
    userId: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function createMockListResult(
  overrides: Partial<PlaylistListResult> = {},
): PlaylistListResult {
  return {
    data: [createMockPlaylist()],
    total: 1,
    limit: 20,
    offset: 0,
    ...overrides,
  };
}

// ============================================================================
// fetchPlaylists
// ============================================================================

describe("fetchPlaylists", () => {
  it("sends GET request to /api/playlists without params", async () => {
    const mockResult = createMockListResult();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    const result = await fetchPlaylists();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe("/api/playlists");
    expect(result).toEqual(mockResult);
  });

  it("appends query params when limit and offset are provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockListResult()),
    });

    await fetchPlaylists({ limit: 10, offset: 20 });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("/api/playlists?");
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=20");
  });

  it("omits undefined params from query string", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockListResult()),
    });

    await fetchPlaylists({ limit: 5 });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("limit=5");
    expect(url).not.toContain("offset");
  });

  it("throws error with server message when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: "Internal server error" }),
    });

    await expect(fetchPlaylists()).rejects.toThrow("Internal server error");
  });

  it("throws fallback error when error response is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(fetchPlaylists()).rejects.toThrow(
      "Failed to fetch playlists",
    );
  });

  it("propagates network error from fetch", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(fetchPlaylists()).rejects.toThrow("Failed to fetch");
  });
});

// ============================================================================
// createPlaylist
// ============================================================================

describe("createPlaylist", () => {
  it("sends POST request to /api/playlists with correct headers and body", async () => {
    const mockPlaylist = createMockPlaylist();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPlaylist),
    });

    const payload = { name: "Sunday Worship", songIds: ["song-1", "song-2"] };
    const result = await createPlaylist(payload);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/playlists");
    expect(options.method).toBe("POST");
    expect(
      (options.headers as Record<string, string>)["Content-Type"],
    ).toBe("application/json");
    expect(JSON.parse(options.body as string)).toEqual(payload);
    expect(result).toEqual(mockPlaylist);
  });

  it("sends POST with empty songIds array", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockPlaylist({ songIds: [] })),
    });

    await createPlaylist({ name: "Empty List", songIds: [] });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.songIds).toEqual([]);
  });

  it("throws error with server message when creation fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: "Name is required" }),
    });

    await expect(
      createPlaylist({ name: "", songIds: [] }),
    ).rejects.toThrow("Name is required");
  });

  it("throws fallback error when error response is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(
      createPlaylist({ name: "Test", songIds: [] }),
    ).rejects.toThrow("建立播放清單失敗");
  });
});

// ============================================================================
// updatePlaylist
// ============================================================================

describe("updatePlaylist", () => {
  it("sends PUT request to /api/playlists/:id with partial update data", async () => {
    const mockPlaylist = createMockPlaylist({ name: "Updated Name" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPlaylist),
    });

    const result = await updatePlaylist("pl-1", { name: "Updated Name" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/playlists/pl-1");
    expect(options.method).toBe("PUT");
    expect(
      (options.headers as Record<string, string>)["Content-Type"],
    ).toBe("application/json");
    expect(JSON.parse(options.body as string)).toEqual({
      name: "Updated Name",
    });
    expect(result).toEqual(mockPlaylist);
  });

  it("sends PUT with songIds update", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockPlaylist()),
    });

    await updatePlaylist("pl-1", {
      songIds: ["song-3", "song-4"],
    });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.songIds).toEqual(["song-3", "song-4"]);
  });

  it("encodes special characters in playlist id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockPlaylist()),
    });

    await updatePlaylist("id/with spaces", { name: "New" });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe("/api/playlists/id%2Fwith%20spaces");
  });

  it("throws error with server message when update fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Playlist not found" }),
    });

    await expect(
      updatePlaylist("nonexistent", { name: "X" }),
    ).rejects.toThrow("Playlist not found");
  });

  it("throws fallback error when error response is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("bad json")),
    });

    await expect(
      updatePlaylist("pl-1", { name: "X" }),
    ).rejects.toThrow("更新播放清單失敗");
  });
});

// ============================================================================
// deletePlaylist
// ============================================================================

describe("deletePlaylist", () => {
  it("sends DELETE request to /api/playlists/:id", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await deletePlaylist("pl-1");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/playlists/pl-1");
    expect(options.method).toBe("DELETE");
  });

  it("encodes special characters in playlist id", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await deletePlaylist("id with/slash");

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe("/api/playlists/id%20with%2Fslash");
  });

  it("resolves to undefined on success", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await deletePlaylist("pl-1");

    expect(result).toBeUndefined();
  });

  it("throws error with server message when deletion fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ message: "Permission denied" }),
    });

    await expect(deletePlaylist("pl-1")).rejects.toThrow("Permission denied");
  });

  it("throws fallback error when error response is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(deletePlaylist("pl-1")).rejects.toThrow("刪除播放清單失敗");
  });
});
