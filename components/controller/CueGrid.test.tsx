/**
 * CueGrid 元件測試
 *
 * 覆蓋範圍：
 * 1. 基本渲染：歌詞行網格顯示、行號、CueGridHeader
 * 2. 點擊行跳轉：呼叫 jumpToLine 和 onManualOverride
 * 3. 當前行高亮：LIVE 標記、active 樣式
 * 4. 空歌詞狀態："No Track Selected" 提示
 * 5. Transport Controls：進度條、Next Cue 按鈕、disabled 狀態
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// jsdom 不支援 scrollIntoView，需要 mock
Element.prototype.scrollIntoView = vi.fn();

// ============================================================================
// Mock 設定
// ============================================================================

// 模擬 next-intl
vi.mock("next-intl", async () => {
  const { createNextIntlMock } = await import("@/lib/test-utils/i18n-mock");
  return createNextIntlMock();
});

const mockStoreState = new Map<string, unknown>();

/** 預設 displaySettings，與 store defaultDisplaySettings 一致 */
const defaultDisplaySettings = {
  displayLines: 4,
  fontSize: 32,
  fontFamily: "Inter",
  lineSpacing: 0.5,
  theme: "dark",
  showBackground: true,
  backgroundColor: "#000000",
  backgroundImage: "",
  textColor: "#ffffff",
  highlightColor: "#0ea5e9",
  autoScroll: true,
  scrollDuration: 300,
  enableAnimation: true,
};

vi.mock("@/lib/store", () => ({
  useLyricsStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => {
      const stateObj: Record<string, unknown> = {};
      mockStoreState.forEach((value, key) => {
        stateObj[key] = value;
      });
      return selector(stateObj);
    },
    {
      // QuickSettings 使用 getState()，CueGrid 不用，但統一提供
      getState: () => {
        const stateObj: Record<string, unknown> = {};
        mockStoreState.forEach((value, key) => {
          stateObj[key] = value;
        });
        return stateObj;
      },
    },
  ),
}));

// Mock useKeyboardShortcuts — CueGrid 內部使用，測試中略過
vi.mock("@/lib/hooks/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}));

import { CueGrid } from "./CueGrid";

// ============================================================================
// 測試輔助
// ============================================================================

const sampleLyrics = ["奇異恩典", "何等甘甜", "我曾迷失", "今被尋回", "瞎眼今得看見"];

function resetStore(overrides: Record<string, unknown> = {}) {
  mockStoreState.clear();
  mockStoreState.set("lyrics", sampleLyrics);
  mockStoreState.set("currentIndex", 1);
  mockStoreState.set("currentSong", {
    id: "song-1",
    title: "Amazing Grace",
    lyrics: sampleLyrics,
    userId: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });
  mockStoreState.set("displaySettings", defaultDisplaySettings);
  mockStoreState.set("jumpToLine", vi.fn());
  mockStoreState.set("nextLine", vi.fn());
  mockStoreState.set("prevLine", vi.fn());
  mockStoreState.set("togglePlaying", vi.fn());
  for (const [key, value] of Object.entries(overrides)) {
    mockStoreState.set(key, value);
  }
}

// ============================================================================
// 測試
// ============================================================================

describe("CueGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  // --------------------------------------------------------------------------
  // 空歌詞狀態
  // --------------------------------------------------------------------------

  describe("empty state", () => {
    it("renders 'No Track Selected' when currentSong is null", () => {
      resetStore({ currentSong: null, lyrics: [] });

      render(<CueGrid />);

      expect(screen.getByText("No Track Selected")).toBeInTheDocument();
      expect(
        screen.getByText("Select a track from the library to begin"),
      ).toBeInTheDocument();
    });

    it("renders 'No Track Selected' when lyrics array is empty", () => {
      resetStore({ lyrics: [] });

      render(<CueGrid />);

      expect(screen.getByText("No Track Selected")).toBeInTheDocument();
    });

    it("renders header even in empty state", () => {
      resetStore({ currentSong: null, lyrics: [] });

      render(<CueGrid />);

      expect(screen.getByText("Line")).toBeInTheDocument();
      expect(screen.getByText("Lyric Payload")).toBeInTheDocument();
      expect(screen.getByText("Action")).toBeInTheDocument();
    });

    it("renders disabled transport control in empty state", () => {
      resetStore({ currentSong: null, lyrics: [] });

      render(<CueGrid />);

      // 空狀態下仍顯示 transport 提示文字
      expect(
        screen.getByText("[ SPACE ] — GO TO NEXT CUE"),
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("basic rendering", () => {
    it("renders all lyric lines with correct line numbers", () => {
      render(<CueGrid />);

      // 所有歌詞行都應渲染
      sampleLyrics.forEach((lyric) => {
        expect(screen.getByText(lyric)).toBeInTheDocument();
      });

      // 行號應存在（使用 getAllByText 因為 transport 進度指示也顯示行號）
      expect(screen.getByText("01")).toBeInTheDocument();
      expect(screen.getAllByText("02").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("03")).toBeInTheDocument();
      expect(screen.getByText("04")).toBeInTheDocument();
      expect(screen.getAllByText("05").length).toBeGreaterThanOrEqual(1);
    });

    it("renders CueGridHeader with column titles", () => {
      render(<CueGrid />);

      expect(screen.getByText("Line")).toBeInTheDocument();
      expect(screen.getByText("Lyric Payload")).toBeInTheDocument();
      expect(screen.getByText("Action")).toBeInTheDocument();
    });

    it("renders transport controls with progress and next cue button", () => {
      render(<CueGrid />);

      // Transport 進度條顯示當前行和總行數
      // 當前行 "02" 出現在行號列和進度指示，使用 getAllByText 確認存在
      const allTwos = screen.getAllByText("02");
      expect(allTwos.length).toBeGreaterThanOrEqual(2); // 行號 + 進度指示

      // Next Cue 按鈕
      expect(
        screen.getByRole("button", { name: /GO TO NEXT CUE/i }),
      ).toBeInTheDocument();
    });

    it("renders empty line placeholder for blank lyrics", () => {
      resetStore({
        lyrics: ["第一行", "", "第三行"],
        currentIndex: 0,
      });

      render(<CueGrid />);

      // 空行應顯示 "(空行)"
      const emptyMarkers = screen.getAllByText("(空行)");
      expect(emptyMarkers.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // 當前行高亮
  // --------------------------------------------------------------------------

  describe("current line highlighting", () => {
    it("renders LIVE badge on the current active line", () => {
      resetStore({ currentIndex: 2 });

      render(<CueGrid />);

      expect(screen.getByText("LIVE")).toBeInTheDocument();
    });

    it("applies highlight color to the active line text", () => {
      resetStore({ currentIndex: 0 });

      render(<CueGrid />);

      // 第一行應為 active，使用 highlightColor
      const activeLine = screen.getByText("奇異恩典");
      expect(activeLine).toHaveStyle({
        color: defaultDisplaySettings.highlightColor,
      });
    });

    it("renders JUMP label on non-active lines (visible on hover)", () => {
      render(<CueGrid />);

      // JUMP 標記存在（至少一個非 active 行有）
      const jumpLabels = screen.getAllByText("JUMP");
      expect(jumpLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // 點擊行跳轉
  // --------------------------------------------------------------------------

  describe("line click navigation", () => {
    it("calls jumpToLine when clicking a non-active line", () => {
      const mockJumpToLine = vi.fn();
      resetStore({ jumpToLine: mockJumpToLine, currentIndex: 0 });

      render(<CueGrid />);

      // 點擊第三行（index 2）
      fireEvent.click(screen.getByText("我曾迷失"));

      expect(mockJumpToLine).toHaveBeenCalledWith(2);
    });

    it("calls jumpToLine when clicking the active line", () => {
      const mockJumpToLine = vi.fn();
      resetStore({ jumpToLine: mockJumpToLine, currentIndex: 1 });

      render(<CueGrid />);

      // 點擊當前行
      fireEvent.click(screen.getByText("何等甘甜"));

      expect(mockJumpToLine).toHaveBeenCalledWith(1);
    });

    it("calls onManualOverride callback when clicking a line", () => {
      const mockOnManualOverride = vi.fn();
      const mockJumpToLine = vi.fn();
      resetStore({ jumpToLine: mockJumpToLine, currentIndex: 0 });

      render(<CueGrid onManualOverride={mockOnManualOverride} />);

      fireEvent.click(screen.getByText("何等甘甜"));

      expect(mockOnManualOverride).toHaveBeenCalledOnce();
    });

    it("does not throw when onManualOverride is undefined", () => {
      const mockJumpToLine = vi.fn();
      resetStore({ jumpToLine: mockJumpToLine, currentIndex: 0 });

      render(<CueGrid />);

      // 不應拋錯
      expect(() => {
        fireEvent.click(screen.getByText("何等甘甜"));
      }).not.toThrow();

      expect(mockJumpToLine).toHaveBeenCalledWith(1);
    });
  });

  // --------------------------------------------------------------------------
  // Transport Controls
  // --------------------------------------------------------------------------

  describe("transport controls", () => {
    it("renders next cue button as enabled when not on last line", () => {
      resetStore({ currentIndex: 0 });

      render(<CueGrid />);

      const nextButton = screen.getByRole("button", {
        name: /GO TO NEXT CUE/i,
      });
      expect(nextButton).not.toBeDisabled();
    });

    it("renders next cue button as disabled when on last line", () => {
      resetStore({ currentIndex: 4 }); // 最後一行（5行，index 4）

      render(<CueGrid />);

      const nextButton = screen.getByRole("button", {
        name: /GO TO NEXT CUE/i,
      });
      expect(nextButton).toBeDisabled();
    });

    it("calls nextLine and onManualOverride when next cue button is clicked", () => {
      const mockNextLine = vi.fn();
      const mockOnManualOverride = vi.fn();
      resetStore({ nextLine: mockNextLine, currentIndex: 0 });

      render(<CueGrid onManualOverride={mockOnManualOverride} />);

      const nextButton = screen.getByRole("button", {
        name: /GO TO NEXT CUE/i,
      });
      fireEvent.click(nextButton);

      expect(mockNextLine).toHaveBeenCalledOnce();
      expect(mockOnManualOverride).toHaveBeenCalledOnce();
    });

    it("does not call nextLine when button is disabled (last line)", () => {
      const mockNextLine = vi.fn();
      resetStore({ nextLine: mockNextLine, currentIndex: 4 });

      render(<CueGrid />);

      const nextButton = screen.getByRole("button", {
        name: /GO TO NEXT CUE/i,
      });
      fireEvent.click(nextButton);

      expect(mockNextLine).not.toHaveBeenCalled();
    });
  });
});
