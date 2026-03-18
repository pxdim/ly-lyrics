/**
 * LyricsPreviewModal 元件測試
 *
 * 測試歌詞預覽 Modal 的各種狀態：關閉、載入中、有歌詞、無歌詞、
 * 簡繁切換、ESC 關閉、匯入按鈕、重新搜尋按鈕。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LyricsPreviewModal } from "./LyricsPreviewModal";
import type { LyricsDetailResponse } from "@/lib/api/lyrics-search";

// Mock chinese-converter — 外部依賴
vi.mock("@/lib/utils/chinese-converter", () => ({
  convertToTraditional: vi.fn((text: string) => `[繁]${text}`),
}));

// ============================================================================
// 測試輔助
// ============================================================================

function createLyricsDetail(
  overrides: Partial<LyricsDetailResponse> = {}
): LyricsDetailResponse {
  return {
    id: "detail-1",
    title: "Amazing Grace",
    artist: "John Newton",
    source: "lrclib",
    syncedLyrics: "[00:01.00] Amazing grace how sweet the sound",
    plainLyrics: "Amazing grace how sweet the sound",
    isSimplified: false,
    ...overrides,
  };
}

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  lyrics: createLyricsDetail(),
  isLoading: false,
  onImport: vi.fn(),
  onReSearch: vi.fn(),
};

// ============================================================================
// 測試
// ============================================================================

describe("LyricsPreviewModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 關閉狀態
  // --------------------------------------------------------------------------

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <LyricsPreviewModal {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe("");
  });

  // --------------------------------------------------------------------------
  // 載入中
  // --------------------------------------------------------------------------

  it("shows loading indicator when isLoading is true", () => {
    render(
      <LyricsPreviewModal {...defaultProps} lyrics={null} isLoading={true} />
    );
    expect(screen.getByText("載入中...")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 無歌詞資料
  // --------------------------------------------------------------------------

  it("shows empty state when lyrics is null and not loading", () => {
    render(
      <LyricsPreviewModal {...defaultProps} lyrics={null} isLoading={false} />
    );
    expect(screen.getByText("無歌詞資料")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 有歌詞內容
  // --------------------------------------------------------------------------

  it("displays song title and artist", () => {
    render(<LyricsPreviewModal {...defaultProps} />);
    expect(screen.getByText(/Amazing Grace/)).toBeInTheDocument();
    expect(screen.getByText(/John Newton/)).toBeInTheDocument();
  });

  it("displays lyrics source", () => {
    render(<LyricsPreviewModal {...defaultProps} />);
    expect(screen.getByText(/lrclib/)).toBeInTheDocument();
  });

  it("shows synced lyrics badge when syncedLyrics exists", () => {
    render(<LyricsPreviewModal {...defaultProps} />);
    expect(screen.getByText(/有時間戳/)).toBeInTheDocument();
  });

  it("displays lyrics content in pre element", () => {
    render(<LyricsPreviewModal {...defaultProps} />);
    expect(
      screen.getByText(/Amazing grace how sweet the sound/)
    ).toBeInTheDocument();
  });

  it("renders import button", () => {
    render(<LyricsPreviewModal {...defaultProps} />);
    expect(screen.getByText(/匯入到歌單/)).toBeInTheDocument();
  });

  it("renders cancel button", () => {
    render(<LyricsPreviewModal {...defaultProps} />);
    expect(screen.getByText("取消")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 無歌詞內容（僅資訊）
  // --------------------------------------------------------------------------

  it("shows info-only message when no lyrics content available", () => {
    const lyrics = createLyricsDetail({
      syncedLyrics: "",
      plainLyrics: "",
    });
    render(<LyricsPreviewModal {...defaultProps} lyrics={lyrics} />);
    expect(
      screen.getByText("此來源僅提供歌曲資訊，不包含歌詞內容")
    ).toBeInTheDocument();
  });

  it("shows Genius link when sourceUrl is provided", () => {
    const lyrics = createLyricsDetail({
      syncedLyrics: "",
      plainLyrics: "",
      sourceUrl: "https://genius.com/test",
    });
    render(<LyricsPreviewModal {...defaultProps} lyrics={lyrics} />);
    const link = screen.getByText("前往 Genius 查看歌詞");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "https://genius.com/test");
    expect(link.closest("a")).toHaveAttribute("target", "_blank");
  });

  it("shows re-search button when onReSearch is provided and no lyrics", () => {
    const lyrics = createLyricsDetail({
      syncedLyrics: "",
      plainLyrics: "",
    });
    render(<LyricsPreviewModal {...defaultProps} lyrics={lyrics} />);
    expect(screen.getByText(/用「Amazing Grace」重新搜尋歌詞/)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 簡繁切換
  // --------------------------------------------------------------------------

  it("shows SimplifiedToggle when lyrics is simplified", () => {
    const lyrics = createLyricsDetail({ isSimplified: true });
    render(<LyricsPreviewModal {...defaultProps} lyrics={lyrics} />);
    expect(screen.getByText(/轉繁體/)).toBeInTheDocument();
  });

  it("does not show SimplifiedToggle when lyrics is not simplified", () => {
    const lyrics = createLyricsDetail({ isSimplified: false });
    render(<LyricsPreviewModal {...defaultProps} lyrics={lyrics} />);
    expect(screen.queryByText(/轉繁體/)).not.toBeInTheDocument();
  });

  it("converts lyrics to traditional when toggle is clicked", () => {
    const lyrics = createLyricsDetail({
      isSimplified: true,
      syncedLyrics: "简体歌词",
    });
    render(<LyricsPreviewModal {...defaultProps} lyrics={lyrics} />);

    // 點擊轉繁體按鈕
    fireEvent.click(screen.getByText(/轉繁體/));

    // convertToTraditional mock 會加上 [繁] 前綴
    expect(screen.getByText(/\[繁\]简体歌词/)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 使用者互動
  // --------------------------------------------------------------------------

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<LyricsPreviewModal {...defaultProps} onClose={onClose} />);

    // 標題列的 X 按鈕（含 svg）
    const closeButtons = screen.getAllByRole("button");
    // 第一個按鈕是 X 關閉按鈕
    fireEvent.click(closeButtons[0]!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    render(<LyricsPreviewModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("取消"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <LyricsPreviewModal {...defaultProps} onClose={onClose} />
    );
    // 最外層 div 是 backdrop
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when ESC key is pressed", () => {
    const onClose = vi.fn();
    render(<LyricsPreviewModal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onImport with lyrics and traditional flag when import button is clicked", () => {
    const onImport = vi.fn();
    const lyrics = createLyricsDetail();
    render(
      <LyricsPreviewModal {...defaultProps} lyrics={lyrics} onImport={onImport} />
    );
    fireEvent.click(screen.getByText(/匯入到歌單/));
    expect(onImport).toHaveBeenCalledOnce();
    expect(onImport).toHaveBeenCalledWith(lyrics, false);
  });

  it("calls onImport with traditional flag true after toggling", () => {
    const onImport = vi.fn();
    const lyrics = createLyricsDetail({ isSimplified: true });
    render(
      <LyricsPreviewModal {...defaultProps} lyrics={lyrics} onImport={onImport} />
    );

    // 先切換到繁體
    fireEvent.click(screen.getByText(/轉繁體/));
    // 再匯入
    fireEvent.click(screen.getByText(/匯入到歌單/));

    expect(onImport).toHaveBeenCalledWith(lyrics, true);
  });

  it("calls onReSearch and onClose when re-search button is clicked", () => {
    const onReSearch = vi.fn();
    const onClose = vi.fn();
    const lyrics = createLyricsDetail({
      syncedLyrics: "",
      plainLyrics: "",
      title: "My Song",
      artist: "Singer",
    });
    render(
      <LyricsPreviewModal
        {...defaultProps}
        lyrics={lyrics}
        onReSearch={onReSearch}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText(/用「My Song」重新搜尋歌詞/));
    expect(onReSearch).toHaveBeenCalledWith("My Song", "Singer");
    expect(onClose).toHaveBeenCalledOnce();
  });

  // --------------------------------------------------------------------------
  // 標題列
  // --------------------------------------------------------------------------

  it("renders modal title", () => {
    render(<LyricsPreviewModal {...defaultProps} />);
    expect(screen.getByText("歌詞預覽")).toBeInTheDocument();
  });
});
