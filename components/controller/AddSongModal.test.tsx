/**
 * AddSongModal 元件測試
 *
 * 覆蓋 Modal 開關、Tab 切換、手動輸入表單驗證、
 * 提交成功回呼、ESC 關閉、背景點擊關閉等行為。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

const mockCreateSong = vi.fn();

vi.mock("@/lib/api/songs", () => ({
  createSong: (...args: unknown[]) => mockCreateSong(...args),
}));

// 模擬 LyricsSearchPanel — 不渲染真實搜尋面板
vi.mock("@/components/lyrics-search/LyricsSearchPanel", () => ({
  LyricsSearchPanel: ({
    onSongAdded,
    onClose,
  }: {
    onSongAdded: () => void;
    onClose: () => void;
  }) => (
    <div data-testid="lyrics-search-panel">
      <button onClick={onSongAdded}>mock-song-added</button>
      <button onClick={onClose}>mock-close</button>
    </div>
  ),
}));

// 模擬 LrcDropZone
vi.mock("@/components/lrc/LrcDropZone", () => ({
  LrcDropZone: ({
    onImportSuccess,
  }: {
    onImportSuccess?: () => void;
  }) => (
    <div data-testid="lrc-drop-zone">
      <button onClick={onImportSuccess}>mock-import-success</button>
    </div>
  ),
}));

// 載入元件（必須在 vi.mock 之後）
import { AddSongModal } from "./AddSongModal";

// ============================================================================
// 預設 Props
// ============================================================================

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSongAdded: vi.fn(),
  initialTab: "manual" as const,
};

// ============================================================================
// 測試
// ============================================================================

describe("AddSongModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 模擬 window.matchMedia（元件內偵測手機螢幕用）
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  // ==========================================================================
  // Modal 開關
  // ==========================================================================

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <AddSongModal {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders modal content when isOpen is true", () => {
    render(<AddSongModal {...defaultProps} />);
    expect(screen.getByText("Add Track")).toBeInTheDocument();
  });

  it("closes modal when clicking the close button", () => {
    const onClose = vi.fn();
    render(<AddSongModal {...defaultProps} onClose={onClose} />);

    // 關閉按鈕在標題列右側
    const buttons = screen.getAllByRole("button");
    // 找到包含 X SVG 的按鈕（標題列最右邊的 button）
    const closeButton = buttons.find((btn) => {
      const svg = btn.querySelector("svg");
      return svg && btn.closest(".border-b");
    });
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes modal when pressing Escape", () => {
    const onClose = vi.fn();
    render(<AddSongModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes modal when clicking the backdrop", () => {
    const onClose = vi.fn();
    render(<AddSongModal {...defaultProps} onClose={onClose} />);

    // 背景遮罩是最外層的 fixed div
    const backdrop = screen.getByText("Add Track").closest(".fixed");
    expect(backdrop).not.toBeNull();
    // 點擊 backdrop 本身（e.target === e.currentTarget）
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ==========================================================================
  // Tab 切換
  // ==========================================================================

  it("shows manual input tab by default when initialTab is manual", () => {
    render(<AddSongModal {...defaultProps} initialTab="manual" />);
    // 手動輸入 tab 的表單應包含 Title 標籤
    expect(screen.getByText("Title *")).toBeInTheDocument();
  });

  it("shows search tab when initialTab is search", () => {
    render(<AddSongModal {...defaultProps} initialTab="search" />);
    expect(screen.getByTestId("lyrics-search-panel")).toBeInTheDocument();
  });

  it("shows LRC import tab when initialTab is lrc", () => {
    render(<AddSongModal {...defaultProps} initialTab="lrc" />);
    expect(screen.getByTestId("lrc-drop-zone")).toBeInTheDocument();
  });

  it("switches to manual tab when clicking manual tab button", () => {
    render(<AddSongModal {...defaultProps} initialTab="search" />);

    // 搜尋面板應可見
    expect(screen.getByTestId("lyrics-search-panel")).toBeInTheDocument();

    // 點擊手動輸入 tab
    fireEvent.click(screen.getByText(/手動輸入/));

    // 手動輸入表單應可見
    expect(screen.getByText("Title *")).toBeInTheDocument();
    // 搜尋面板應不可見
    expect(screen.queryByTestId("lyrics-search-panel")).not.toBeInTheDocument();
  });

  it("switches to search tab when clicking search tab button", () => {
    render(<AddSongModal {...defaultProps} initialTab="manual" />);

    fireEvent.click(screen.getByText(/搜尋歌詞/));

    expect(screen.getByTestId("lyrics-search-panel")).toBeInTheDocument();
    expect(screen.queryByText("Title *")).not.toBeInTheDocument();
  });

  it("switches to LRC tab when clicking LRC tab button", () => {
    render(<AddSongModal {...defaultProps} initialTab="manual" />);

    fireEvent.click(screen.getByText(/匯入 LRC/));

    expect(screen.getByTestId("lrc-drop-zone")).toBeInTheDocument();
    expect(screen.queryByText("Title *")).not.toBeInTheDocument();
  });

  // ==========================================================================
  // 手動輸入表單驗證
  // ==========================================================================

  it("shows error when submitting with empty title", async () => {
    render(<AddSongModal {...defaultProps} initialTab="manual" />);

    // 不輸入任何東西直接點提交
    fireEvent.click(screen.getByText("ADD TRACK"));

    await waitFor(() => {
      expect(screen.getByText("請輸入歌曲名稱")).toBeInTheDocument();
    });

    expect(mockCreateSong).not.toHaveBeenCalled();
  });

  it("shows error when submitting with title but no lyrics", async () => {
    render(<AddSongModal {...defaultProps} initialTab="manual" />);

    const titleInput = screen.getByPlaceholderText("輸入歌曲名稱...");
    fireEvent.change(titleInput, { target: { value: "Test Song" } });

    fireEvent.click(screen.getByText("ADD TRACK"));

    await waitFor(() => {
      expect(screen.getByText("請輸入至少一行歌詞")).toBeInTheDocument();
    });

    expect(mockCreateSong).not.toHaveBeenCalled();
  });

  it("shows error when submitting with only whitespace title", async () => {
    render(<AddSongModal {...defaultProps} initialTab="manual" />);

    const titleInput = screen.getByPlaceholderText("輸入歌曲名稱...");
    fireEvent.change(titleInput, { target: { value: "   " } });

    fireEvent.click(screen.getByText("ADD TRACK"));

    await waitFor(() => {
      expect(screen.getByText("請輸入歌曲名稱")).toBeInTheDocument();
    });
  });

  it("shows error when submitting with only blank lines in lyrics", async () => {
    render(<AddSongModal {...defaultProps} initialTab="manual" />);

    const titleInput = screen.getByPlaceholderText("輸入歌曲名稱...");
    fireEvent.change(titleInput, { target: { value: "Test Song" } });

    const lyricsTextarea = screen.getByPlaceholderText(/第一行歌詞/);
    fireEvent.change(lyricsTextarea, { target: { value: "  \n  \n  " } });

    fireEvent.click(screen.getByText("ADD TRACK"));

    await waitFor(() => {
      expect(screen.getByText("請輸入至少一行歌詞")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 提交成功
  // ==========================================================================

  it("submits song and calls onSongAdded and onClose on success", async () => {
    const onSongAdded = vi.fn();
    const onClose = vi.fn();
    mockCreateSong.mockResolvedValue({
      id: "new-song",
      title: "Test Song",
      lyrics: ["Line 1", "Line 2"],
    });

    render(
      <AddSongModal
        {...defaultProps}
        initialTab="manual"
        onSongAdded={onSongAdded}
        onClose={onClose}
      />,
    );

    const titleInput = screen.getByPlaceholderText("輸入歌曲名稱...");
    fireEvent.change(titleInput, { target: { value: "Test Song" } });

    const artistInput = screen.getByPlaceholderText("輸入歌手名稱（選填）...");
    fireEvent.change(artistInput, { target: { value: "Test Artist" } });

    const lyricsTextarea = screen.getByPlaceholderText(/第一行歌詞/);
    fireEvent.change(lyricsTextarea, {
      target: { value: "Line 1\nLine 2\n\nLine 3" },
    });

    fireEvent.click(screen.getByText("ADD TRACK"));

    await waitFor(() => {
      expect(mockCreateSong).toHaveBeenCalledWith({
        title: "Test Song",
        artist: "Test Artist",
        lyrics: ["Line 1", "Line 2", "Line 3"],
      });
    });

    await waitFor(() => {
      expect(onSongAdded).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("submits song without artist when artist is empty", async () => {
    mockCreateSong.mockResolvedValue({ id: "new-song" });

    render(<AddSongModal {...defaultProps} initialTab="manual" />);

    const titleInput = screen.getByPlaceholderText("輸入歌曲名稱...");
    fireEvent.change(titleInput, { target: { value: "Test Song" } });

    const lyricsTextarea = screen.getByPlaceholderText(/第一行歌詞/);
    fireEvent.change(lyricsTextarea, { target: { value: "Line 1" } });

    fireEvent.click(screen.getByText("ADD TRACK"));

    await waitFor(() => {
      expect(mockCreateSong).toHaveBeenCalledWith({
        title: "Test Song",
        lyrics: ["Line 1"],
      });
    });

    // 確認 artist 欄位沒有被包含
    const callArg = mockCreateSong.mock.calls[0]![0];
    expect(callArg).not.toHaveProperty("artist");
  });

  it("shows API error message when createSong fails", async () => {
    mockCreateSong.mockRejectedValue(new Error("伺服器錯誤"));

    render(<AddSongModal {...defaultProps} initialTab="manual" />);

    const titleInput = screen.getByPlaceholderText("輸入歌曲名稱...");
    fireEvent.change(titleInput, { target: { value: "Test Song" } });

    const lyricsTextarea = screen.getByPlaceholderText(/第一行歌詞/);
    fireEvent.change(lyricsTextarea, { target: { value: "Line 1" } });

    fireEvent.click(screen.getByText("ADD TRACK"));

    await waitFor(() => {
      expect(screen.getByText("伺服器錯誤")).toBeInTheDocument();
    });
  });

  it("shows generic error when createSong throws non-Error", async () => {
    mockCreateSong.mockRejectedValue("unknown failure");

    render(<AddSongModal {...defaultProps} initialTab="manual" />);

    const titleInput = screen.getByPlaceholderText("輸入歌曲名稱...");
    fireEvent.change(titleInput, { target: { value: "Test Song" } });

    const lyricsTextarea = screen.getByPlaceholderText(/第一行歌詞/);
    fireEvent.change(lyricsTextarea, { target: { value: "Line 1" } });

    fireEvent.click(screen.getByText("ADD TRACK"));

    await waitFor(() => {
      expect(screen.getByText("建立歌曲失敗")).toBeInTheDocument();
    });
  });

  it("shows ADDING... text and disables button during submission", async () => {
    // 讓 createSong 保持 pending 狀態
    mockCreateSong.mockReturnValue(new Promise(() => {}));

    render(<AddSongModal {...defaultProps} initialTab="manual" />);

    const titleInput = screen.getByPlaceholderText("輸入歌曲名稱...");
    fireEvent.change(titleInput, { target: { value: "Test Song" } });

    const lyricsTextarea = screen.getByPlaceholderText(/第一行歌詞/);
    fireEvent.change(lyricsTextarea, { target: { value: "Line 1" } });

    fireEvent.click(screen.getByText("ADD TRACK"));

    await waitFor(() => {
      expect(screen.getByText("ADDING...")).toBeInTheDocument();
    });

    // 提交按鈕應被禁用
    const submitButton = screen.getByText("ADDING...").closest("button");
    expect(submitButton).toHaveAttribute("disabled");
  });

  // ==========================================================================
  // 狀態重置
  // ==========================================================================

  it("resets form when modal re-opens", () => {
    const { rerender } = render(
      <AddSongModal {...defaultProps} initialTab="manual" />,
    );

    // 填入資料
    const titleInput = screen.getByPlaceholderText("輸入歌曲名稱...");
    fireEvent.change(titleInput, { target: { value: "Test" } });

    // 關閉再重開
    rerender(<AddSongModal {...defaultProps} isOpen={false} />);
    rerender(
      <AddSongModal {...defaultProps} isOpen={true} initialTab="manual" />,
    );

    // 表單應被清空
    const newTitleInput = screen.getByPlaceholderText(
      "輸入歌曲名稱...",
    ) as HTMLInputElement;
    expect(newTitleInput.value).toBe("");
  });

  // ==========================================================================
  // Cancel 按鈕
  // ==========================================================================

  it("calls onClose when clicking CANCEL button on manual tab", () => {
    const onClose = vi.fn();
    render(
      <AddSongModal {...defaultProps} initialTab="manual" onClose={onClose} />,
    );

    fireEvent.click(screen.getByText("CANCEL"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
