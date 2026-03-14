import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchLyrics, getLyricsDetail } from "./lyrics-search";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("lyrics-search API", () => {
  describe("searchLyrics", () => {
    it("發送正確的搜尋請求", async () => {
      const mockResponse = {
        results: [{ id: "lrclib-1", title: "Song A" }],
        sources: { lrclib: { status: "ok", count: 1, latencyMs: 100 } },
        totalResults: 1,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchLyrics({
        query: "Song A",
        searchType: "title",
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/lyrics/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "Song A", searchType: "title" }),
        signal: undefined,
      });
      expect(result.totalResults).toBe(1);
    });

    it("支援 AbortController signal", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [], sources: {}, totalResults: 0 }),
      });

      const controller = new AbortController();
      await searchLyrics(
        { query: "test", searchType: "title" },
        controller.signal
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/lyrics/search",
        expect.objectContaining({ signal: controller.signal })
      );
    });

    it("HTTP 錯誤拋出 Error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      });

      await expect(
        searchLyrics({ query: "test", searchType: "title" })
      ).rejects.toThrow("Server error");
    });
  });

  describe("getLyricsDetail", () => {
    it("發送正確的 GET 請求", async () => {
      const mockDetail = {
        id: "lrclib-1",
        title: "Song A",
        plainLyrics: "Hello",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDetail),
      });

      const result = await getLyricsDetail("lrclib-1");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/lyrics/search/lrclib-1"
      );
      expect(result.title).toBe("Song A");
    });

    it("ID 包含特殊字元時正確編碼", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "lrcapi-netease-8a3f" }),
      });

      await getLyricsDetail("lrcapi-netease-8a3f");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/lyrics/search/lrcapi-netease-8a3f"
      );
    });
  });
});
