/**
 * LyricsDisplay 元件測試 — 背景圖片功能 (FR4.3)
 *
 * 覆蓋範圍：
 * 1. 有背景圖片且 showBackground=true 時套用 backgroundImage
 * 2. showBackground=false 時不套用背景圖片
 * 3. backgroundImage 為空字串時不套用
 * 4. 背景圖片同時保留 backgroundColor（作為 fallback）
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ============================================================================
// jsdom 環境補丁
// ============================================================================

// jsdom 不提供 scrollIntoView，LyricsDisplay 的 auto-scroll 使用
Element.prototype.scrollIntoView = vi.fn();

// jsdom 不提供 matchMedia，LyricsDisplay 內部使用 window.matchMedia 偵測手機寬度
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

import { LyricsDisplay } from "./LyricsDisplay";

// ============================================================================
// 測試輔助
// ============================================================================

const sampleLyrics = ["奇異恩典", "何等甘甜", "我曾迷失", "今被尋回"];

function resetStore(overrides: Record<string, unknown> = {}) {
  mockStoreState.clear();
  mockStoreState.set("lyrics", sampleLyrics);
  mockStoreState.set("currentIndex", 1);
  mockStoreState.set("displaySettings", { ...defaultDisplaySettings });
  for (const [key, value] of Object.entries(overrides)) {
    mockStoreState.set(key, value);
  }
}

// ============================================================================
// 測試
// ============================================================================

describe("LyricsDisplay", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("背景圖片 (FR4.3)", () => {
    it("showBackground=true 且有 backgroundImage 時，套用 backgroundImage style", () => {
      const testDataUrl = "data:image/png;base64,iVBORw0KGgo=";
      resetStore({
        displaySettings: {
          ...defaultDisplaySettings,
          showBackground: true,
          backgroundImage: testDataUrl,
        },
      });

      const { container } = render(<LyricsDisplay />);
      const displayContainer = container.querySelector(".lyrics-display");

      expect(displayContainer).toBeTruthy();
      const style = (displayContainer as HTMLElement).style;
      expect(style.backgroundImage).toContain(testDataUrl);
      expect(style.backgroundSize).toBe("cover");
      expect(style.backgroundPosition).toContain("center");
    });

    it("showBackground=false 時，不套用 backgroundImage", () => {
      const testDataUrl = "data:image/png;base64,iVBORw0KGgo=";
      resetStore({
        displaySettings: {
          ...defaultDisplaySettings,
          showBackground: false,
          backgroundImage: testDataUrl,
        },
      });

      const { container } = render(<LyricsDisplay />);
      const displayContainer = container.querySelector(".lyrics-display");

      expect(displayContainer).toBeTruthy();
      const style = (displayContainer as HTMLElement).style;
      // showBackground=false 時，background 為 transparent，不應有 backgroundImage
      expect(style.backgroundImage).toBe("");
    });

    it("backgroundImage 為空字串時，不套用 backgroundImage style", () => {
      resetStore({
        displaySettings: {
          ...defaultDisplaySettings,
          showBackground: true,
          backgroundImage: "",
        },
      });

      const { container } = render(<LyricsDisplay />);
      const displayContainer = container.querySelector(".lyrics-display");

      expect(displayContainer).toBeTruthy();
      const style = (displayContainer as HTMLElement).style;
      expect(style.backgroundImage).toBe("");
    });

    it("背景圖片與 backgroundColor 同時存在時，兩者都套用", () => {
      const testDataUrl = "data:image/jpeg;base64,/9j/4AAQ";
      resetStore({
        displaySettings: {
          ...defaultDisplaySettings,
          showBackground: true,
          backgroundColor: "#1a1a2e",
          backgroundImage: testDataUrl,
        },
      });

      const { container } = render(<LyricsDisplay />);
      const displayContainer = container.querySelector(".lyrics-display");

      expect(displayContainer).toBeTruthy();
      const style = (displayContainer as HTMLElement).style;
      // backgroundColor 作為圖片載入前的 fallback（jsdom 會將 hex 轉為 rgb）
      expect(style.backgroundColor).toBe("rgb(26, 26, 46)");
      expect(style.backgroundImage).toContain(testDataUrl);
    });
  });

  // ============================================================================
  // 基本渲染（歌詞行顯示）
  // ============================================================================

  describe("basic rendering", () => {
    it("renders all visible lyrics lines", () => {
      resetStore({ currentIndex: 0 });

      render(<LyricsDisplay />);

      // displayLines=4, currentIndex=0 → 前 4 行
      expect(screen.getByText("奇異恩典")).toBeInTheDocument();
      expect(screen.getByText("何等甘甜")).toBeInTheDocument();
      expect(screen.getByText("我曾迷失")).toBeInTheDocument();
      expect(screen.getByText("今被尋回")).toBeInTheDocument();
    });

    it("renders lyrics from props override", () => {
      resetStore();

      render(
        <LyricsDisplay
          lyrics={["Props 歌詞第一行", "Props 歌詞第二行"]}
          currentIndex={0}
          displayLines={2}
        />
      );

      expect(screen.getByText("Props 歌詞第一行")).toBeInTheDocument();
      expect(screen.getByText("Props 歌詞第二行")).toBeInTheDocument();
    });

    it("limits visible lines to displayLines setting", () => {
      const manyLyrics = ["行1", "行2", "行3", "行4", "行5", "行6", "行7", "行8"];
      resetStore({ lyrics: manyLyrics, currentIndex: 0 });

      // displayLines=4 （default），所以只顯示 4 行
      render(<LyricsDisplay />);

      expect(screen.getByText("行1")).toBeInTheDocument();
      expect(screen.getByText("行2")).toBeInTheDocument();
      expect(screen.getByText("行3")).toBeInTheDocument();
      expect(screen.getByText("行4")).toBeInTheDocument();
      expect(screen.queryByText("行5")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // 當前行高亮
  // ============================================================================

  describe("current line highlight", () => {
    it("marks current line as active via data-active attribute", () => {
      resetStore({ currentIndex: 1 });

      render(<LyricsDisplay />);

      const activeElement = document.querySelector('[data-active="true"]');
      expect(activeElement).not.toBeNull();
      expect(activeElement!.textContent).toBe("何等甘甜");
    });

    it("sets non-current lines as inactive", () => {
      resetStore({ currentIndex: 1 });

      render(<LyricsDisplay />);

      const inactiveElements = document.querySelectorAll('[data-active="false"]');
      // 4 行顯示中 3 行非 active
      expect(inactiveElements.length).toBe(3);
    });

    it("applies highlightColor to active line", () => {
      resetStore({
        currentIndex: 0,
        displaySettings: { ...defaultDisplaySettings, highlightColor: "#ff6600" },
      });

      render(<LyricsDisplay />);

      const activeLine = document.querySelector('[data-active="true"]') as HTMLElement;
      expect(activeLine).not.toBeNull();
      expect(activeLine.style.color).toBe("rgb(255, 102, 0)");
    });

    it("applies textColor to inactive lines", () => {
      resetStore({
        currentIndex: 0,
        displaySettings: { ...defaultDisplaySettings, textColor: "#cccccc" },
      });

      render(<LyricsDisplay />);

      const inactiveLine = document.querySelector('[data-active="false"]') as HTMLElement;
      expect(inactiveLine).not.toBeNull();
      expect(inactiveLine.style.color).toBe("rgb(204, 204, 204)");
    });
  });

  // ============================================================================
  // displaySettings 套用
  // ============================================================================

  describe("displaySettings application", () => {
    it("applies fontSize to lyrics lines", () => {
      resetStore({
        currentIndex: 0,
        displaySettings: { ...defaultDisplaySettings, fontSize: 48 },
      });

      render(<LyricsDisplay />);

      const line = document.querySelector('[data-active="true"]') as HTMLElement;
      expect(line).not.toBeNull();
      expect(line.style.fontSize).toBe("48px");
    });

    it("applies lineSpacing as gap between lyrics", () => {
      resetStore({
        currentIndex: 0,
        displaySettings: { ...defaultDisplaySettings, fontSize: 32, lineSpacing: 1.0 },
      });

      const { container } = render(<LyricsDisplay />);

      const lyricsContainer = container.querySelector(".lyrics-container") as HTMLElement;
      expect(lyricsContainer).not.toBeNull();
      // gap = fontSize * lineSpacing = 32 * 1.0 = 32px
      expect(lyricsContainer.style.gap).toBe("32px");
    });

    it("uses desktop padding when not mobile", () => {
      resetStore({ currentIndex: 0 });

      const { container } = render(<LyricsDisplay />);

      const displayContainer = container.querySelector(".lyrics-display") as HTMLElement;
      expect(displayContainer).not.toBeNull();
      expect(displayContainer.style.padding).toBe("2rem");
    });
  });

  // ============================================================================
  // 空歌詞狀態
  // ============================================================================

  describe("empty lyrics state", () => {
    it("shows empty state message when lyrics array is empty", () => {
      resetStore({ lyrics: [] });

      render(<LyricsDisplay />);

      expect(screen.getByText("NO LYRICS LOADED")).toBeInTheDocument();
      expect(screen.getByText("Select a song to begin")).toBeInTheDocument();
    });

    it("does not render lyrics lines in empty state", () => {
      resetStore({ lyrics: [] });

      render(<LyricsDisplay />);

      const lyricsLines = document.querySelectorAll(".lyrics-line");
      expect(lyricsLines.length).toBe(0);
    });
  });

  // ============================================================================
  // showBackground toggle
  // ============================================================================

  describe("showBackground toggle", () => {
    it("applies backgroundColor when showBackground is true", () => {
      resetStore({
        currentIndex: 0,
        displaySettings: {
          ...defaultDisplaySettings,
          showBackground: true,
          backgroundColor: "#000000",
        },
      });

      const { container } = render(<LyricsDisplay />);

      const displayContainer = container.querySelector(".lyrics-display") as HTMLElement;
      expect(displayContainer).not.toBeNull();
      expect(displayContainer.style.backgroundColor).toBe("rgb(0, 0, 0)");
    });

    it("uses transparent background when showBackground is false", () => {
      resetStore({
        currentIndex: 0,
        displaySettings: {
          ...defaultDisplaySettings,
          showBackground: false,
        },
      });

      const { container } = render(<LyricsDisplay />);

      const displayContainer = container.querySelector(".lyrics-display") as HTMLElement;
      expect(displayContainer).not.toBeNull();
      expect(displayContainer.style.backgroundColor).toBe("transparent");
    });
  });

  // ============================================================================
  // 設計系統合規（無硬編碼色值）
  // ============================================================================

  describe("design system compliance", () => {
    it("does not contain hardcoded color hex values in className", () => {
      resetStore({ currentIndex: 0 });

      const { container } = render(<LyricsDisplay />);

      // 取得所有元素的 class，確認無硬編碼 hex 色值（如 bg-[#xxx], text-[#xxx]）
      const allElements = container.querySelectorAll("*");
      const hexColorPattern = /(?:bg|text|border)-\[#[0-9a-fA-F]{3,8}\]/;

      allElements.forEach((el) => {
        if (el.className && typeof el.className === "string") {
          expect(el.className).not.toMatch(hexColorPattern);
        }
      });
    });

    it("uses style props for dynamic colors instead of Tailwind arbitrary values", () => {
      resetStore({ currentIndex: 0 });

      render(<LyricsDisplay />);

      // LyricsLine 使用 style={{ color: ... }} 而非 Tailwind class
      const activeLine = document.querySelector('[data-active="true"]') as HTMLElement;
      expect(activeLine).not.toBeNull();
      // 應透過 style.color 設定顏色
      expect(activeLine.style.color).toBeTruthy();
    });
  });

  // ============================================================================
  // 歌詞視窗滑動（前瞻偏移邏輯）
  // ============================================================================

  describe("visible lyrics windowing", () => {
    it("shows correct window when currentIndex is near the end", () => {
      const lyrics = ["行1", "行2", "行3", "行4", "行5"];
      resetStore({
        lyrics,
        currentIndex: 4,
        displaySettings: { ...defaultDisplaySettings, displayLines: 3 },
      });

      render(<LyricsDisplay />);

      // currentIndex=4, displayLines=3 → 最後 3 行
      expect(screen.getByText("行3")).toBeInTheDocument();
      expect(screen.getByText("行4")).toBeInTheDocument();
      expect(screen.getByText("行5")).toBeInTheDocument();
      expect(screen.queryByText("行1")).not.toBeInTheDocument();
    });

    it("highlights correct line after windowing adjustment", () => {
      const lyrics = ["行1", "行2", "行3", "行4", "行5"];
      resetStore({
        lyrics,
        currentIndex: 3,
        displaySettings: { ...defaultDisplaySettings, displayLines: 3 },
      });

      render(<LyricsDisplay />);

      const activeLine = document.querySelector('[data-active="true"]');
      expect(activeLine).not.toBeNull();
      expect(activeLine!.textContent).toBe("行4");
    });
  });

  // ============================================================================
  // enableAnimation 設定
  // ============================================================================

  describe("enableAnimation setting", () => {
    it("applies transition style when enableAnimation is true", () => {
      resetStore({
        currentIndex: 0,
        displaySettings: {
          ...defaultDisplaySettings,
          enableAnimation: true,
          scrollDuration: 300,
        },
      });

      const { container } = render(<LyricsDisplay />);

      const displayContainer = container.querySelector(".lyrics-display") as HTMLElement;
      expect(displayContainer.style.transition).toContain("background-color");
      expect(displayContainer.style.transition).toContain("300ms");
    });

    it("sets transition to none when enableAnimation is false", () => {
      resetStore({
        currentIndex: 0,
        displaySettings: {
          ...defaultDisplaySettings,
          enableAnimation: false,
        },
      });

      const { container } = render(<LyricsDisplay />);

      const displayContainer = container.querySelector(".lyrics-display") as HTMLElement;
      expect(displayContainer.style.transition).toBe("none");
    });
  });
});
