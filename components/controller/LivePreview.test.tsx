/**
 * LivePreview 元件測試
 *
 * 覆蓋範圍：
 * 1. 基本渲染：標題區、16:9 預覽區、角標資訊
 * 2. 預覽內容同步歌詞：根據 calcVisibleLines 顯示可見行
 * 3. 當前行高亮色和非當前行樣式
 * 4. 無歌曲（disabled）狀態：顯示 "NO SIGNAL"
 * 5. LIVE 標記：有歌曲時顯示
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

const mockStoreState = new Map<string, unknown>();

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
  useLyricsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const stateObj: Record<string, unknown> = {};
    mockStoreState.forEach((value, key) => {
      stateObj[key] = value;
    });
    return selector(stateObj);
  },
}));

// Mock calcVisibleLines — 使用真實邏輯
vi.mock("@/lib/utils/visible-lines", () => ({
  calcVisibleLines: ({
    currentIndex,
    totalLines,
    visibleCount,
  }: {
    currentIndex: number;
    totalLines: number;
    visibleCount: number;
  }) => {
    if (totalLines === 0) return { start: 0, end: 0 };
    const effectiveVisible = Math.min(visibleCount, totalLines);
    const offset = Math.floor(effectiveVisible / 3);
    let start = currentIndex - offset;
    if (start < 0) start = 0;
    if (start + effectiveVisible > totalLines) {
      start = totalLines - effectiveVisible;
    }
    if (start < 0) start = 0;
    return { start, end: start + effectiveVisible };
  },
}));

import { LivePreview } from "./LivePreview";

// ============================================================================
// 測試輔助
// ============================================================================

const sampleLyrics = [
  "奇異恩典",
  "何等甘甜",
  "我曾迷失",
  "今被尋回",
  "瞎眼今得看見",
];

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
  mockStoreState.set("displaySettings", { ...defaultDisplaySettings });
  for (const [key, value] of Object.entries(overrides)) {
    mockStoreState.set(key, value);
  }
}

// ============================================================================
// 測試
// ============================================================================

describe("LivePreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("basic rendering", () => {
    it("renders the Program Out header", () => {
      render(<LivePreview />);

      expect(screen.getByText("Program Out")).toBeInTheDocument();
    });

    it("renders Preview label", () => {
      render(<LivePreview />);

      expect(screen.getByText("Preview")).toBeInTheDocument();
    });

    it("renders corner info showing display lines and font size", () => {
      render(<LivePreview />);

      // 角標格式：{displayLines}L / {fontSize}px
      expect(screen.getByText("4L / 32px")).toBeInTheDocument();
    });

    it("renders channel indicator", () => {
      render(<LivePreview />);

      expect(screen.getByText("CH 1")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // LIVE 標記
  // --------------------------------------------------------------------------

  describe("LIVE badge", () => {
    it("shows LIVE badge when currentSong is set", () => {
      render(<LivePreview />);

      expect(screen.getByText("LIVE")).toBeInTheDocument();
    });

    it("does not show LIVE badge when currentSong is null", () => {
      resetStore({ currentSong: null });

      render(<LivePreview />);

      expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 預覽內容同步歌詞
  // --------------------------------------------------------------------------

  describe("lyrics preview content", () => {
    it("renders visible lyrics based on current index and display lines", () => {
      // displayLines=4, currentIndex=1
      // calcVisibleLines: offset=1, start=0, end=4
      // 可見行: 奇異恩典, 何等甘甜, 我曾迷失, 今被尋回
      render(<LivePreview />);

      expect(screen.getByText("奇異恩典")).toBeInTheDocument();
      expect(screen.getByText("何等甘甜")).toBeInTheDocument();
      expect(screen.getByText("我曾迷失")).toBeInTheDocument();
      expect(screen.getByText("今被尋回")).toBeInTheDocument();
    });

    it("applies highlight color to the active line", () => {
      resetStore({ currentIndex: 1 });

      render(<LivePreview />);

      // currentIndex=1 => "何等甘甜" 是 active
      const activeLine = screen.getByText("何等甘甜");
      expect(activeLine).toHaveStyle({
        color: defaultDisplaySettings.highlightColor,
      });
    });

    it("applies text color to non-active lines", () => {
      resetStore({ currentIndex: 1 });

      render(<LivePreview />);

      // "奇異恩典" 不是 active，使用 textColor
      const inactiveLine = screen.getByText("奇異恩典");
      expect(inactiveLine).toHaveStyle({
        color: defaultDisplaySettings.textColor,
      });
    });

    it("applies full opacity to active line", () => {
      resetStore({ currentIndex: 1 });

      render(<LivePreview />);

      const activeLine = screen.getByText("何等甘甜");
      expect(activeLine).toHaveStyle({ opacity: "1" });
    });

    it("applies reduced opacity to non-active lines", () => {
      resetStore({ currentIndex: 1 });

      render(<LivePreview />);

      const inactiveLine = screen.getByText("奇異恩典");
      expect(inactiveLine).toHaveStyle({ opacity: "0.4" });
    });

    it("updates corner info when display settings change", () => {
      resetStore({
        displaySettings: {
          ...defaultDisplaySettings,
          displayLines: 6,
          fontSize: 48,
        },
      });

      render(<LivePreview />);

      expect(screen.getByText("6L / 48px")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // disabled 狀態（無歌曲）
  // --------------------------------------------------------------------------

  describe("disabled state (no song)", () => {
    it("renders NO SIGNAL when currentSong is null", () => {
      resetStore({ currentSong: null, lyrics: [] });

      render(<LivePreview />);

      expect(screen.getByText("NO SIGNAL")).toBeInTheDocument();
    });

    it("renders NO SIGNAL when lyrics are empty", () => {
      resetStore({ lyrics: [] });

      render(<LivePreview />);

      expect(screen.getByText("NO SIGNAL")).toBeInTheDocument();
    });

    it("does not render any lyric text in disabled state", () => {
      resetStore({ currentSong: null, lyrics: [] });

      render(<LivePreview />);

      sampleLyrics.forEach((lyric) => {
        expect(screen.queryByText(lyric)).not.toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 預覽背景色
  // --------------------------------------------------------------------------

  describe("preview background", () => {
    it("uses backgroundColor when showBackground is true", () => {
      resetStore({
        displaySettings: {
          ...defaultDisplaySettings,
          showBackground: true,
          backgroundColor: "#1a1a2e",
        },
      });

      render(<LivePreview />);

      // 預覽區背景色應為 backgroundColor
      // 使用 aspect-video container
      const previewContainer = document.querySelector(".aspect-video");
      expect(previewContainer).toHaveStyle({
        backgroundColor: "#1a1a2e",
      });
    });

    it("uses black background when showBackground is false", () => {
      resetStore({
        displaySettings: {
          ...defaultDisplaySettings,
          showBackground: false,
          backgroundColor: "#1a1a2e",
        },
      });

      render(<LivePreview />);

      const previewContainer = document.querySelector(".aspect-video");
      expect(previewContainer).toHaveStyle({
        backgroundColor: "#000000",
      });
    });
  });
});
