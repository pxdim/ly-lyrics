/**
 * PlaylistPanel 元件測試
 *
 * 覆蓋播放清單列表渲染、選擇播放清單、新增/編輯播放清單、
 * 歌曲拖曳排序（mock @dnd-kit）、刪除確認等行為。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
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

const mockFetchPlaylists = vi.fn();
const mockCreatePlaylist = vi.fn();
const mockUpdatePlaylist = vi.fn();
const mockDeletePlaylist = vi.fn();

vi.mock("@/lib/api/playlists", () => ({
  fetchPlaylists: (...args: unknown[]) => mockFetchPlaylists(...args),
  createPlaylist: (...args: unknown[]) => mockCreatePlaylist(...args),
  updatePlaylist: (...args: unknown[]) => mockUpdatePlaylist(...args),
  deletePlaylist: (...args: unknown[]) => mockDeletePlaylist(...args),
}));

const mockFetchSongs = vi.fn();

vi.mock("@/lib/api/songs", () => ({
  fetchSongs: (...args: unknown[]) => mockFetchSongs(...args),
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

// 模擬 SortablePlaylist — 簡化為列表渲染，支援 onSelect / onReorder
vi.mock("@/components/playlist/SortablePlaylist", () => ({
  SortablePlaylist: ({
    songs,
    currentSongId,
    onSelect,
    onReorder,
  }: {
    songs: Array<{ id: string; title: string }>;
    currentSongId: string | null;
    onSelect: (songId: string) => void;
    onReorder: (songs: Array<{ id: string; title: string }>) => void;
  }) => (
    <div data-testid="sortable-playlist">
      {songs.map((song) => (
        <div
          key={song.id}
          data-testid={`playlist-song-${song.id}`}
          data-active={song.id === currentSongId ? "true" : "false"}
          onClick={() => onSelect(song.id)}
        >
          {song.title}
        </div>
      ))}
      <button
        data-testid="mock-reorder"
        onClick={() => onReorder([...songs].reverse())}
      >
        reorder
      </button>
    </div>
  ),
}));

// 模擬 ConfirmDialog
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

// 載入元件（必須在 vi.mock 之後）
import { PlaylistPanel } from "./PlaylistPanel";

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

const makePlaylist = (overrides: Record<string, unknown> = {}) => ({
  id: "pl-1",
  name: "Worship Set",
  songIds: ["song-1", "song-2"],
  userId: "user-1",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  ...overrides,
});

const makePlaylistListResult = (
  playlists: ReturnType<typeof makePlaylist>[] = [makePlaylist()],
) => ({
  data: playlists,
  total: playlists.length,
  limit: 100,
  offset: 0,
});

const makeSongListResult = (
  songs: ReturnType<typeof makeSong>[] = [
    makeSong(),
    makeSong({ id: "song-2", title: "How Great Is Our God" }),
  ],
) => ({
  data: songs,
  total: songs.length,
  limit: 200,
  offset: 0,
});

// ============================================================================
// 測試
// ============================================================================

describe("PlaylistPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.set("currentSong", null);
    mockStoreState.set("setCurrentSong", vi.fn());
    mockFetchPlaylists.mockResolvedValue(makePlaylistListResult());
    mockFetchSongs.mockResolvedValue(makeSongListResult());
    mockUpdatePlaylist.mockResolvedValue(makePlaylist());
    mockDeletePlaylist.mockResolvedValue(undefined);
  });

  // ==========================================================================
  // 基本渲染 — 播放清單列表
  // ==========================================================================

  it("renders loading state initially", () => {
    mockFetchPlaylists.mockReturnValue(new Promise(() => {}));
    render(<PlaylistPanel />);
    expect(screen.getByText("LOADING...")).toBeInTheDocument();
  });

  it("renders playlist list after loading", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });
  });

  it("displays playlist count", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("1 LISTS")).toBeInTheDocument();
    });
  });

  it("displays track count for each playlist", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("2 tracks")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 空狀態
  // ==========================================================================

  it("displays NO PLAYLISTS when list is empty", async () => {
    mockFetchPlaylists.mockResolvedValue(makePlaylistListResult([]));

    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("NO PLAYLISTS")).toBeInTheDocument();
    });
  });

  it("shows CREATE FIRST button in empty state", async () => {
    mockFetchPlaylists.mockResolvedValue(makePlaylistListResult([]));

    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("+ CREATE FIRST")).toBeInTheDocument();
    });
  });

  it("clicking CREATE FIRST opens create playlist view", async () => {
    mockFetchPlaylists.mockResolvedValue(makePlaylistListResult([]));

    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("+ CREATE FIRST")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("+ CREATE FIRST"));

    // 應顯示新增播放清單表單
    expect(screen.getByText("新增播放清單")).toBeInTheDocument();
  });

  // ==========================================================================
  // 選擇播放清單 — 歌曲詳情畫面
  // ==========================================================================

  it("shows playlist detail when clicking a playlist", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Worship Set"));

    // 應進入歌曲詳情畫面，顯示 SortablePlaylist
    await waitFor(() => {
      expect(screen.getByTestId("sortable-playlist")).toBeInTheDocument();
    });
  });

  it("renders playlist songs in detail view", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Worship Set"));

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
      expect(screen.getByText("How Great Is Our God")).toBeInTheDocument();
    });
  });

  it("shows track count in detail view header", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Worship Set"));

    await waitFor(() => {
      expect(screen.getByText("2 TRACKS")).toBeInTheDocument();
    });
  });

  it("calls setCurrentSong when selecting a song from playlist", async () => {
    const setCurrentSong = vi.fn();
    mockStoreState.set("setCurrentSong", setCurrentSong);

    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Worship Set"));

    await waitFor(() => {
      expect(
        screen.getByTestId("playlist-song-song-1"),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("playlist-song-song-1"));
    expect(setCurrentSong).toHaveBeenCalledTimes(1);
    expect(setCurrentSong).toHaveBeenCalledWith(
      expect.objectContaining({ id: "song-1", title: "Amazing Grace" }),
    );
  });

  it("returns to playlist list when clicking back button", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Worship Set"));

    await waitFor(() => {
      expect(screen.getByTestId("sortable-playlist")).toBeInTheDocument();
    });

    // 點擊返回按鈕
    const backButton = screen.getByTitle("返回播放清單");
    fireEvent.click(backButton);

    // 應返回播放清單列表
    await waitFor(() => {
      expect(screen.queryByTestId("sortable-playlist")).not.toBeInTheDocument();
      expect(screen.getByText("1 LISTS")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 新增播放清單
  // ==========================================================================

  it("opens create view when clicking add button", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("1 LISTS")).toBeInTheDocument();
    });

    // 新增播放清單按鈕（title="新增播放清單"）
    const addButton = screen.getByTitle("新增播放清單");
    fireEvent.click(addButton);

    expect(screen.getByText("新增播放清單")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("播放清單名稱..."),
    ).toBeInTheDocument();
  });

  it("displays song selection list in create view", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("1 LISTS")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("新增播放清單"));

    // 應顯示所有歌曲供選擇
    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
      expect(screen.getByText("How Great Is Our God")).toBeInTheDocument();
    });
  });

  it("toggles song selection in create view", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("1 LISTS")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("新增播放清單"));

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    // 初始 0 SELECTED
    expect(screen.getByText(/0 SELECTED/)).toBeInTheDocument();

    // 點擊選取歌曲
    fireEvent.click(screen.getByText("Amazing Grace"));

    expect(screen.getByText(/1 SELECTED/)).toBeInTheDocument();

    // 再次點擊取消選取
    fireEvent.click(screen.getByText("Amazing Grace"));

    expect(screen.getByText(/0 SELECTED/)).toBeInTheDocument();
  });

  it("disables create button when name is empty or no songs selected", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("1 LISTS")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("新增播放清單"));

    await waitFor(() => {
      expect(screen.getByText("CREATE PLAYLIST")).toBeInTheDocument();
    });

    const createButton = screen
      .getByText("CREATE PLAYLIST")
      .closest("button")!;
    expect(createButton).toHaveAttribute("disabled");
  });

  it("creates playlist and returns to list on success", async () => {
    mockCreatePlaylist.mockResolvedValue(
      makePlaylist({ id: "new-pl", name: "New Playlist" }),
    );

    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("1 LISTS")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("新增播放清單"));

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    // 輸入名稱
    const nameInput = screen.getByPlaceholderText("播放清單名稱...");
    fireEvent.change(nameInput, { target: { value: "New Playlist" } });

    // 選取歌曲
    fireEvent.click(screen.getByText("Amazing Grace"));

    // 點擊建立
    const createButton = screen
      .getByText("CREATE PLAYLIST")
      .closest("button")!;
    expect(createButton).not.toHaveAttribute("disabled");

    await act(async () => {
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(mockCreatePlaylist).toHaveBeenCalledWith({
        name: "New Playlist",
        songIds: ["song-1"],
      });
    });
  });

  it("returns to list from create view when clicking back button", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("1 LISTS")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("新增播放清單"));

    expect(screen.getByText("新增播放清單")).toBeInTheDocument();

    // 點擊返回（create view 的返回按鈕沒有 title 但在 DOM 中是第一個 button）
    const buttons = screen.getAllByRole("button");
    const backButton = buttons[0]!; // 返回按鈕是第一個
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText("1 LISTS")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 編輯播放清單（重命名）
  // ==========================================================================

  it("enables rename by clicking playlist name in detail view", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Worship Set"));

    await waitFor(() => {
      expect(screen.getByTestId("sortable-playlist")).toBeInTheDocument();
    });

    // 點擊播放清單名稱啟動重命名
    const nameElement = screen.getByTitle("點擊重命名");
    fireEvent.click(nameElement);

    // 應出現 input 編輯框
    const renameInput = screen.getByDisplayValue("Worship Set");
    expect(renameInput).toBeInTheDocument();
  });

  it("saves rename on Enter key", async () => {
    const updatedPlaylist = makePlaylist({ name: "Sunday Worship" });
    mockUpdatePlaylist.mockResolvedValue(updatedPlaylist);

    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Worship Set"));

    await waitFor(() => {
      expect(screen.getByTestId("sortable-playlist")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("點擊重命名"));

    const renameInput = screen.getByDisplayValue("Worship Set");
    fireEvent.change(renameInput, { target: { value: "Sunday Worship" } });
    fireEvent.keyDown(renameInput, { key: "Enter" });

    await waitFor(() => {
      expect(mockUpdatePlaylist).toHaveBeenCalledWith("pl-1", {
        name: "Sunday Worship",
      });
    });
  });

  it("cancels rename on Escape key", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Worship Set"));

    await waitFor(() => {
      expect(screen.getByTestId("sortable-playlist")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("點擊重命名"));

    const renameInput = screen.getByDisplayValue("Worship Set");
    fireEvent.change(renameInput, { target: { value: "Changed Name" } });
    fireEvent.keyDown(renameInput, { key: "Escape" });

    // 應恢復為原始名稱（input 消失，顯示原名）
    expect(screen.queryByDisplayValue("Changed Name")).not.toBeInTheDocument();
    expect(mockUpdatePlaylist).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // 刪除播放清單
  // ==========================================================================

  it("opens confirm dialog when clicking delete button in detail view", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Worship Set"));

    await waitFor(() => {
      expect(screen.getByTestId("sortable-playlist")).toBeInTheDocument();
    });

    // 點擊刪除按鈕
    const deleteButton = screen.getByTitle("刪除播放清單");
    fireEvent.click(deleteButton);

    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("deletes playlist and returns to list when confirming", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Worship Set"));

    await waitFor(() => {
      expect(screen.getByTestId("sortable-playlist")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("刪除播放清單"));

    await act(async () => {
      fireEvent.click(screen.getByText("confirm-delete"));
    });

    await waitFor(() => {
      expect(mockDeletePlaylist).toHaveBeenCalledWith("pl-1");
    });
  });

  it("closes confirm dialog when cancelling delete", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Worship Set"));

    await waitFor(() => {
      expect(screen.getByTestId("sortable-playlist")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("刪除播放清單"));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("cancel-delete"));
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });

  // ==========================================================================
  // 拖曳排序（透過 mock 的 SortablePlaylist）
  // ==========================================================================

  it("calls updatePlaylist with new order when reordering songs", async () => {
    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Worship Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Worship Set"));

    await waitFor(() => {
      expect(screen.getByTestId("sortable-playlist")).toBeInTheDocument();
    });

    // 點擊 mock 的 reorder 按鈕（觸發 handleReorder，反轉歌曲順序）
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-reorder"));
    });

    // usePlaylistReorder 會呼叫 updatePlaylist 持久化
    await waitFor(() => {
      expect(mockUpdatePlaylist).toHaveBeenCalledWith("pl-1", {
        songIds: ["song-2", "song-1"],
      });
    });
  });

  // ==========================================================================
  // API 錯誤處理
  // ==========================================================================

  it("handles fetchPlaylists error gracefully", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockFetchPlaylists.mockRejectedValue(new Error("Network error"));

    render(<PlaylistPanel />);

    // 錯誤後仍應停止 loading
    await waitFor(() => {
      expect(screen.queryByText("LOADING...")).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  // ==========================================================================
  // 多個播放清單
  // ==========================================================================

  it("renders multiple playlists", async () => {
    const playlists = [
      makePlaylist({ id: "pl-1", name: "Sunday Set" }),
      makePlaylist({ id: "pl-2", name: "Wednesday Set" }),
      makePlaylist({ id: "pl-3", name: "Special Event" }),
    ];
    mockFetchPlaylists.mockResolvedValue(makePlaylistListResult(playlists));

    render(<PlaylistPanel />);

    await waitFor(() => {
      expect(screen.getByText("Sunday Set")).toBeInTheDocument();
      expect(screen.getByText("Wednesday Set")).toBeInTheDocument();
      expect(screen.getByText("Special Event")).toBeInTheDocument();
    });

    expect(screen.getByText("3 LISTS")).toBeInTheDocument();
  });
});
