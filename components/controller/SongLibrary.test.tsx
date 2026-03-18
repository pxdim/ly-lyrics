/**
 * SongLibrary 元件測試
 *
 * 覆蓋歌曲列表渲染、搜尋過濾、選曲回呼、空狀態、
 * 刪除確認流程、LRC 匯出按鈕、排序功能（FR1.7）等行為。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

// 模擬 fetchSongs / deleteSong
const mockFetchSongs = vi.fn();
const mockDeleteSong = vi.fn();

vi.mock("@/lib/api/songs", () => ({
  fetchSongs: (...args: unknown[]) => mockFetchSongs(...args),
  deleteSong: (...args: unknown[]) => mockDeleteSong(...args),
}));

// 模擬 Zustand store
const mockStoreState = new Map<string, unknown>([
  ["currentSong", null],
  ["setCurrentSong", vi.fn()],
]);

vi.mock("@/lib/store", () => ({
  useLyricsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const stateObj: Record<string, unknown> = {};
    mockStoreState.forEach((value, key) => {
      stateObj[key] = value;
    });
    return selector(stateObj);
  },
}));

// 模擬 AddSongModal — 只驗證 props 傳遞，不渲染真實 Modal
vi.mock("@/components/controller/AddSongModal", () => ({
  AddSongModal: ({
    isOpen,
    initialTab,
  }: {
    isOpen: boolean;
    initialTab: string;
  }) =>
    isOpen ? (
      <div data-testid="add-song-modal" data-tab={initialTab}>
        AddSongModal
      </div>
    ) : null,
}));

// 模擬 LrcDropZone
vi.mock("@/components/lrc/LrcDropZone", () => ({
  LrcDropZone: () => <div data-testid="lrc-drop-zone">LrcDropZone</div>,
}));

// 模擬 LRC 匯出函式
const mockGenerateLrcContent = vi.fn().mockReturnValue("[00:00.00] test");
const mockDownloadLrcFile = vi.fn();

vi.mock("@/lib/lrc/export", () => ({
  generateLrcContent: (...args: unknown[]) =>
    mockGenerateLrcContent(...args),
  downloadLrcFile: (...args: unknown[]) => mockDownloadLrcFile(...args),
}));

// 模擬 ConfirmDialog — 直接渲染確認/取消按鈕以便測試互動
vi.mock("@/components/ui/ConfirmDialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <button onClick={onConfirm}>confirm-delete</button>
        <button onClick={onCancel}>cancel-delete</button>
      </div>
    ) : null,
}));

// 模擬 lucide-react 圖示
vi.mock("lucide-react", () => ({
  Download: (props: Record<string, unknown>) => (
    <svg data-testid="download-icon" {...props} />
  ),
  ArrowUpDown: (props: Record<string, unknown>) => (
    <svg data-testid="arrow-up-down-icon" {...props} />
  ),
}));

// 載入元件（必須在 vi.mock 之後）
import { SongLibrary } from "./SongLibrary";

// ============================================================================
// 測試用資料
// ============================================================================

const makeSong = (overrides: Record<string, unknown> = {}) => ({
  id: "song-1",
  title: "Amazing Grace",
  artist: "John Newton",
  lyrics: ["Amazing grace", "How sweet the sound"],
  userId: "user-1",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  ...overrides,
});

const makeSongListResult = (
  songs: ReturnType<typeof makeSong>[] = [makeSong()],
) => ({
  data: songs,
  total: songs.length,
  limit: 100,
  offset: 0,
});

// ============================================================================
// 測試
// ============================================================================

describe("SongLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockStoreState.set("currentSong", null);
    mockStoreState.set("setCurrentSong", vi.fn());
    mockFetchSongs.mockResolvedValue(makeSongListResult());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // 基本渲染
  // ==========================================================================

  it("renders loading state initially", () => {
    // fetchSongs 不要立即 resolve，讓 loading 狀態可被觀察
    mockFetchSongs.mockReturnValue(new Promise(() => {}));
    render(<SongLibrary />);
    expect(screen.getByText("LOADING...")).toBeInTheDocument();
  });

  it("renders song list after loading", async () => {
    render(<SongLibrary />);

    // 觸發 useEffect 中的 timer（搜尋防抖 300ms）
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });
    expect(screen.getByText("John Newton")).toBeInTheDocument();
  });

  it("displays track count", async () => {
    const songs = [
      makeSong({ id: "s1", title: "Song 1" }),
      makeSong({ id: "s2", title: "Song 2" }),
    ];
    mockFetchSongs.mockResolvedValue(makeSongListResult(songs));

    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("2 TRACKS")).toBeInTheDocument();
    });
  });

  it("displays lyrics line count for each song", async () => {
    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      // makeSong 預設有 2 行歌詞
      expect(screen.getByText("2L")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 空狀態
  // ==========================================================================

  it("displays EMPTY when no songs exist", async () => {
    mockFetchSongs.mockResolvedValue(makeSongListResult([]));

    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("EMPTY")).toBeInTheDocument();
    });
  });

  it("displays NO RESULTS when search yields nothing", async () => {
    // 初次載入 + 300ms debounce 都返回有歌曲的結果
    mockFetchSongs.mockResolvedValueOnce(makeSongListResult());
    mockFetchSongs.mockResolvedValueOnce(makeSongListResult());
    // 搜尋後沒有結果
    mockFetchSongs.mockResolvedValue(makeSongListResult([]));

    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // 等初始載入完成
    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    // 輸入搜尋文字
    const searchInput = screen.getByPlaceholderText("搜尋歌曲...");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("NO RESULTS")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 搜尋過濾
  // ==========================================================================

  it("calls fetchSongs with search query after debounce", async () => {
    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // 等初始載入完成
    await waitFor(() => {
      expect(mockFetchSongs).toHaveBeenCalled();
    });

    mockFetchSongs.mockClear();

    const searchInput = screen.getByPlaceholderText("搜尋歌曲...");
    fireEvent.change(searchInput, { target: { value: "grace" } });

    // 在 300ms 防抖時間之前不應呼叫
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(mockFetchSongs).not.toHaveBeenCalled();

    // 防抖時間到後才呼叫
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(mockFetchSongs).toHaveBeenCalledWith(
        expect.objectContaining({ search: "grace" }),
      );
    });
  });

  // ==========================================================================
  // 選擇歌曲
  // ==========================================================================

  it("calls setCurrentSong when clicking a song", async () => {
    const setCurrentSong = vi.fn();
    mockStoreState.set("setCurrentSong", setCurrentSong);

    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Amazing Grace"));
    expect(setCurrentSong).toHaveBeenCalledTimes(1);
    expect(setCurrentSong).toHaveBeenCalledWith(
      expect.objectContaining({ id: "song-1", title: "Amazing Grace" }),
    );
  });

  it("highlights the currently selected song", async () => {
    const song = makeSong();
    mockStoreState.set("currentSong", song);

    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    // 當前歌曲所在行應有 border-l-primary class
    const songRow = screen
      .getByText("Amazing Grace")
      .closest("[class*='border-l-primary']");
    expect(songRow).not.toBeNull();
  });

  // ==========================================================================
  // 新增歌曲 Modal
  // ==========================================================================

  it("opens AddSongModal with search tab when clicking search button", async () => {
    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.click(screen.getByText("搜尋歌詞"));

    expect(screen.getByTestId("add-song-modal")).toBeInTheDocument();
    expect(screen.getByTestId("add-song-modal")).toHaveAttribute(
      "data-tab",
      "search",
    );
  });

  it("opens AddSongModal with manual tab when clicking manual button", async () => {
    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.click(screen.getByText("手動輸入"));

    expect(screen.getByTestId("add-song-modal")).toBeInTheDocument();
    expect(screen.getByTestId("add-song-modal")).toHaveAttribute(
      "data-tab",
      "manual",
    );
  });

  it("opens AddSongModal with lrc tab when clicking LRC import button", async () => {
    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.click(screen.getByText("匯入 LRC"));

    expect(screen.getByTestId("add-song-modal")).toBeInTheDocument();
    expect(screen.getByTestId("add-song-modal")).toHaveAttribute(
      "data-tab",
      "lrc",
    );
  });

  // ==========================================================================
  // 刪除歌曲
  // ==========================================================================

  it("opens confirm dialog when clicking delete button", async () => {
    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    // 刪除按鈕有 title="刪除歌曲"
    const deleteButton = screen.getByTitle("刪除歌曲");
    fireEvent.click(deleteButton);

    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("calls deleteSong and reloads list when confirming delete", async () => {
    mockDeleteSong.mockResolvedValue(undefined);
    // 初始載入 + 刪除後重新載入
    mockFetchSongs
      .mockResolvedValueOnce(makeSongListResult())
      .mockResolvedValueOnce(makeSongListResult())
      .mockResolvedValue(makeSongListResult([]));

    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    // 開啟確認對話框
    fireEvent.click(screen.getByTitle("刪除歌曲"));

    // 確認刪除
    await act(async () => {
      fireEvent.click(screen.getByText("confirm-delete"));
    });

    await waitFor(() => {
      expect(mockDeleteSong).toHaveBeenCalledWith("song-1");
    });
  });

  it("clears currentSong when deleting the active song", async () => {
    const setCurrentSong = vi.fn();
    mockStoreState.set("currentSong", makeSong());
    mockStoreState.set("setCurrentSong", setCurrentSong);
    mockDeleteSong.mockResolvedValue(undefined);

    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    // 開啟確認對話框
    fireEvent.click(screen.getByTitle("刪除歌曲"));

    // 確認刪除
    await act(async () => {
      fireEvent.click(screen.getByText("confirm-delete"));
    });

    await waitFor(() => {
      expect(setCurrentSong).toHaveBeenCalledWith(null);
    });
  });

  it("closes confirm dialog when cancelling delete", async () => {
    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("刪除歌曲"));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("cancel-delete"));
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });

  // ==========================================================================
  // LRC 匯出
  // ==========================================================================

  it("triggers LRC export when clicking download button", async () => {
    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    const exportButton = screen.getByTitle("匯出 LRC");
    fireEvent.click(exportButton);

    expect(mockGenerateLrcContent).toHaveBeenCalledWith(
      "Amazing Grace",
      "John Newton",
      ["Amazing grace", "How sweet the sound"],
      undefined, // lrcTimestamps 未設定
    );
    expect(mockDownloadLrcFile).toHaveBeenCalledWith(
      "[00:00.00] test",
      "Amazing Grace",
    );
  });

  // ==========================================================================
  // LrcDropZone 渲染
  // ==========================================================================

  it("renders LrcDropZone component", async () => {
    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByTestId("lrc-drop-zone")).toBeInTheDocument();
  });

  // ==========================================================================
  // API 錯誤處理
  // ==========================================================================

  it("handles fetchSongs error gracefully without crashing", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockFetchSongs.mockRejectedValue(new Error("Network error"));

    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // 錯誤後仍應停止 loading，顯示空狀態
    await waitFor(() => {
      expect(screen.queryByText("LOADING...")).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  // ==========================================================================
  // 歌曲排序（FR1.7）
  // ==========================================================================

  it("renders sort toggle button", async () => {
    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    // 排序按鈕應包含排序指示
    expect(screen.getByLabelText("排序方式")).toBeInTheDocument();
  });

  it("sorts songs by title ascending when clicking sort button", async () => {
    const songs = [
      makeSong({ id: "s1", title: "Cornerstone", artist: "Hillsong" }),
      makeSong({ id: "s2", title: "Amazing Grace", artist: "John Newton" }),
      makeSong({
        id: "s3",
        title: "Bless the Lord",
        artist: "Matt Redman",
      }),
    ];
    mockFetchSongs.mockResolvedValue(makeSongListResult(songs));

    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Cornerstone")).toBeInTheDocument();
    });

    // 點擊排序按鈕啟動排序（預設按歌名升冪）
    fireEvent.click(screen.getByLabelText("排序方式"));

    // 排序後的歌曲標題應按字母順序排列
    const songTitles = screen
      .getAllByTestId("song-title")
      .map((el) => el.textContent);
    expect(songTitles).toEqual([
      "Amazing Grace",
      "Bless the Lord",
      "Cornerstone",
    ]);
  });

  it("cycles through sort modes on repeated clicks", async () => {
    const songs = [
      makeSong({ id: "s1", title: "Cornerstone", artist: "Hillsong" }),
      makeSong({ id: "s2", title: "Amazing Grace", artist: "John Newton" }),
    ];
    mockFetchSongs.mockResolvedValue(makeSongListResult(songs));

    render(<SongLibrary />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Cornerstone")).toBeInTheDocument();
    });

    const sortButton = screen.getByLabelText("排序方式");

    // 第一次點擊：歌名升冪
    fireEvent.click(sortButton);
    expect(screen.getByText(/歌名/)).toBeInTheDocument();

    // 第二次點擊：歌名降冪
    fireEvent.click(sortButton);
    let titles = screen
      .getAllByTestId("song-title")
      .map((el) => el.textContent);
    expect(titles).toEqual(["Cornerstone", "Amazing Grace"]);

    // 第三次點擊：歌手升冪
    fireEvent.click(sortButton);
    expect(screen.getByText(/歌手/)).toBeInTheDocument();

    // 第四次點擊：歌手降冪
    fireEvent.click(sortButton);
    const artists = screen
      .getAllByTestId("song-title")
      .map((el) => el.textContent);
    // 歌手降冪：John Newton (Amazing Grace) -> Hillsong (Cornerstone)
    expect(artists).toEqual(["Amazing Grace", "Cornerstone"]);

    // 第五次點擊：關閉排序，恢復原始順序
    fireEvent.click(sortButton);
    titles = screen
      .getAllByTestId("song-title")
      .map((el) => el.textContent);
    expect(titles).toEqual(["Cornerstone", "Amazing Grace"]);
  });
});
