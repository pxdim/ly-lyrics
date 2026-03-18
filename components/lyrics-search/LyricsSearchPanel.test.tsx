/**
 * LyricsSearchPanel 元件測試
 *
 * 整合測試：搜尋面板協調 Input → Results → PreviewModal 的完整流程。
 * Mock 外部 API 呼叫和繁簡轉換。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LyricsSearchPanel } from "./LyricsSearchPanel";
import type {
  LyricsSearchResponse,
  LyricsDetailResponse,
} from "@/lib/api/lyrics-search";

// Mock API 層 — 外部依賴
vi.mock("@/lib/api/lyrics-search", () => ({
  searchLyrics: vi.fn(),
  getLyricsDetail: vi.fn(),
}));

vi.mock("@/lib/utils/chinese-converter", () => ({
  convertToTraditional: vi.fn((text: string) => `[繁]${text}`),
}));

vi.mock("@/lib/api/songs", () => ({
  createSong: vi.fn(),
}));

import { searchLyrics, getLyricsDetail } from "@/lib/api/lyrics-search";
import { createSong } from "@/lib/api/songs";

const mockSearchLyrics = vi.mocked(searchLyrics);
const mockGetLyricsDetail = vi.mocked(getLyricsDetail);
const mockCreateSong = vi.mocked(createSong);

// ============================================================================
// 測試輔助
// ============================================================================

function createSearchResponse(): LyricsSearchResponse {
  return {
    results: [
      {
        id: "r-1",
        title: "Test Song",
        artist: "Test Artist",
        source: "lrclib",
        confidence: "high" as const,
        hasSyncedLyrics: true,
        hasPlainLyrics: true,
        isSimplified: false,
        isAiGenerated: false,
      },
    ],
    sources: { lrclib: { status: "ok" as const, count: 1, latencyMs: 100 } },
    totalResults: 1,
  };
}

function createDetailResponse(): LyricsDetailResponse {
  return {
    id: "r-1",
    title: "Test Song",
    artist: "Test Artist",
    source: "lrclib",
    syncedLyrics: "[00:01.00] Line 1\n[00:05.00] Line 2",
    plainLyrics: "Line 1\nLine 2",
    isSimplified: false,
  };
}

const defaultProps = {
  onSongAdded: vi.fn(),
  onClose: vi.fn(),
};

/**
 * 輸入搜尋關鍵字並透過 Enter 鍵觸發搜尋（繞過 debounce）
 */
function typeAndSearch(query: string) {
  const input = screen.getByPlaceholderText("輸入歌曲名稱...");
  fireEvent.change(input, { target: { value: query } });
  fireEvent.keyDown(input, { key: "Enter" });
}

// ============================================================================
// 測試
// ============================================================================

describe("LyricsSearchPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  it("renders search input", () => {
    render(<LyricsSearchPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText("輸入歌曲名稱...")).toBeInTheDocument();
  });

  it("does not render results initially", () => {
    render(<LyricsSearchPanel {...defaultProps} />);
    expect(screen.queryByText(/搜尋結果/)).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 搜尋流程
  // --------------------------------------------------------------------------

  it("calls searchLyrics API when user triggers search", async () => {
    mockSearchLyrics.mockResolvedValue(createSearchResponse());

    render(<LyricsSearchPanel {...defaultProps} />);
    typeAndSearch("Amazing Grace");

    await waitFor(() => {
      expect(mockSearchLyrics).toHaveBeenCalledOnce();
    });

    expect(mockSearchLyrics).toHaveBeenCalledWith(
      { query: "Amazing Grace", searchType: "title" },
      expect.any(AbortSignal)
    );
  });

  it("displays search results after successful search", async () => {
    mockSearchLyrics.mockResolvedValue(createSearchResponse());

    render(<LyricsSearchPanel {...defaultProps} />);
    typeAndSearch("Test Song");

    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 錯誤處理
  // --------------------------------------------------------------------------

  it("displays error message when search fails", async () => {
    mockSearchLyrics.mockRejectedValue(new Error("網路連線失敗"));

    render(<LyricsSearchPanel {...defaultProps} />);
    typeAndSearch("Test Query");

    await waitFor(() => {
      expect(screen.getByText("網路連線失敗")).toBeInTheDocument();
    });
  });

  it("displays generic error for non-Error exceptions", async () => {
    mockSearchLyrics.mockRejectedValue("unknown");

    render(<LyricsSearchPanel {...defaultProps} />);
    typeAndSearch("Test Query");

    await waitFor(() => {
      expect(screen.getByText("搜尋失敗")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 預覽流程
  // --------------------------------------------------------------------------

  it("opens preview modal when a result is clicked", async () => {
    mockSearchLyrics.mockResolvedValue(createSearchResponse());
    mockGetLyricsDetail.mockResolvedValue(createDetailResponse());

    render(<LyricsSearchPanel {...defaultProps} />);
    typeAndSearch("Test Song");

    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });

    // 點擊結果卡片（result card 是 button）
    const resultButtons = screen.getAllByRole("button");
    const resultCard = resultButtons.find((btn) =>
      btn.textContent?.includes("Test Song") && btn.textContent?.includes("Test Artist")
    );
    fireEvent.click(resultCard!);

    expect(mockGetLyricsDetail).toHaveBeenCalledWith("r-1");

    await waitFor(() => {
      expect(screen.getByText("歌詞預覽")).toBeInTheDocument();
    });
  });

  it("shows error when getLyricsDetail fails", async () => {
    mockSearchLyrics.mockResolvedValue(createSearchResponse());
    mockGetLyricsDetail.mockRejectedValue(new Error("取得歌詞逾時"));

    render(<LyricsSearchPanel {...defaultProps} />);
    typeAndSearch("Test Song");

    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });

    const resultButtons = screen.getAllByRole("button");
    const resultCard = resultButtons.find((btn) =>
      btn.textContent?.includes("Test Song") && btn.textContent?.includes("Test Artist")
    );
    fireEvent.click(resultCard!);

    await waitFor(() => {
      expect(screen.getByText("取得歌詞逾時")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 匯入流程
  // --------------------------------------------------------------------------

  it("calls createSong and callbacks on successful import", async () => {
    mockSearchLyrics.mockResolvedValue(createSearchResponse());
    mockGetLyricsDetail.mockResolvedValue(createDetailResponse());
    mockCreateSong.mockResolvedValue({
      id: "new-song",
      title: "Test Song",
      lyrics: ["Line 1", "Line 2"],
      userId: "u",
      createdAt: "",
      updatedAt: "",
    });

    const onSongAdded = vi.fn();
    const onClose = vi.fn();

    render(<LyricsSearchPanel onSongAdded={onSongAdded} onClose={onClose} />);
    typeAndSearch("Test Song");

    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });

    // 點擊結果
    const resultButtons = screen.getAllByRole("button");
    const resultCard = resultButtons.find((btn) =>
      btn.textContent?.includes("Test Song") && btn.textContent?.includes("Test Artist")
    );
    fireEvent.click(resultCard!);

    await waitFor(() => {
      expect(screen.getByText(/匯入到歌單/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/匯入到歌單/));

    await waitFor(() => {
      expect(mockCreateSong).toHaveBeenCalledOnce();
      expect(onSongAdded).toHaveBeenCalledOnce();
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it("calls createSong with parsed LRC timestamps", async () => {
    mockSearchLyrics.mockResolvedValue(createSearchResponse());
    mockGetLyricsDetail.mockResolvedValue(createDetailResponse());
    mockCreateSong.mockResolvedValue({
      id: "new-song",
      title: "Test Song",
      lyrics: [],
      userId: "u",
      createdAt: "",
      updatedAt: "",
    });

    render(<LyricsSearchPanel {...defaultProps} />);
    typeAndSearch("Test Song");

    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });

    const resultButtons = screen.getAllByRole("button");
    const resultCard = resultButtons.find((btn) =>
      btn.textContent?.includes("Test Song") && btn.textContent?.includes("Test Artist")
    );
    fireEvent.click(resultCard!);

    await waitFor(() => {
      expect(screen.getByText(/匯入到歌單/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/匯入到歌單/));

    await waitFor(() => {
      expect(mockCreateSong).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Song",
          artist: "Test Artist",
          lyrics: expect.arrayContaining(["Line 1"]),
          lrcTimestamps: expect.arrayContaining([1, 5]),
        })
      );
    });
  });

  it("shows error when import fails", async () => {
    mockSearchLyrics.mockResolvedValue(createSearchResponse());
    mockGetLyricsDetail.mockResolvedValue(createDetailResponse());
    mockCreateSong.mockRejectedValue(new Error("伺服器錯誤"));

    render(<LyricsSearchPanel {...defaultProps} />);
    typeAndSearch("Test Song");

    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });

    const resultButtons = screen.getAllByRole("button");
    const resultCard = resultButtons.find((btn) =>
      btn.textContent?.includes("Test Song") && btn.textContent?.includes("Test Artist")
    );
    fireEvent.click(resultCard!);

    await waitFor(() => {
      expect(screen.getByText(/匯入到歌單/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/匯入到歌單/));

    await waitFor(() => {
      expect(screen.getByText("伺服器錯誤")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // AbortError 忽略
  // --------------------------------------------------------------------------

  it("ignores AbortError from cancelled search requests", async () => {
    // 建立一個 name 為 AbortError 的 Error 實例（模擬 fetch abort 行為）
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mockSearchLyrics.mockRejectedValue(abortError);

    render(<LyricsSearchPanel {...defaultProps} />);
    typeAndSearch("Test Query");

    // 等一段時間確認不會顯示錯誤
    await new Promise((r) => setTimeout(r, 100));

    expect(screen.queryByText(/aborted/i)).not.toBeInTheDocument();
    // AbortError 被忽略，不應該顯示任何錯誤訊息
    expect(screen.queryByText("搜尋失敗")).not.toBeInTheDocument();
  });
});
