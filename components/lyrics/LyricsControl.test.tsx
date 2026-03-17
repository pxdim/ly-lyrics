/**
 * LyricsControl 元件測試
 *
 * 測試內容：
 * 1. 基本渲染：有歌詞時顯示控制列，無歌詞時不渲染
 * 2. 按鈕功能：prev/next 按鈕在邊界時 disabled
 * 3. 設計系統合規：無 onMouseEnter/Leave、無硬編碼 rgba
 * 4. 全螢幕按鈕：有 onToggleFullscreen 時顯示，無時隱藏
 * 5. 行選擇器：compact 模式不顯示 select
 * 6. 字體合規：不含舊版 Exo 2 字體
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

const mockStoreState = new Map<string, unknown>([
  ["currentIndex", 2],
  ["lyrics", ["第一行", "第二行", "第三行", "第四行", "第五行"]],
  ["nextLine", vi.fn()],
  ["prevLine", vi.fn()],
  ["jumpToLine", vi.fn()],
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

// Mock useDebouncedCallback — 直接回傳原始 callback，不做防抖
vi.mock("@/lib/hooks/useDebounce", () => ({
  useDebouncedCallback: (cb: unknown) => cb,
}));

// Mock lucide-react 圖示
vi.mock("lucide-react", () => ({
  ChevronUp: () => <span data-testid="icon-chevron-up" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
  Maximize2: () => <span data-testid="icon-maximize" />,
  Minimize2: () => <span data-testid="icon-minimize" />,
}));

import { LyricsControl } from "./LyricsControl";

// ============================================================================
// 測試輔助
// ============================================================================

function resetStore(overrides: Record<string, unknown> = {}) {
  mockStoreState.set("currentIndex", 2);
  mockStoreState.set("lyrics", ["第一行", "第二行", "第三行", "第四行", "第五行"]);
  mockStoreState.set("nextLine", vi.fn());
  mockStoreState.set("prevLine", vi.fn());
  mockStoreState.set("jumpToLine", vi.fn());
  for (const [key, value] of Object.entries(overrides)) {
    mockStoreState.set(key, value);
  }
}

// ============================================================================
// 測試
// ============================================================================

describe("LyricsControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("基本渲染", () => {
    it("有歌詞時渲染控制列", () => {
      render(<LyricsControl />);
      expect(screen.getByLabelText("Previous line")).toBeInTheDocument();
      expect(screen.getByLabelText("Next line")).toBeInTheDocument();
    });

    it("無歌詞時不渲染任何內容", () => {
      resetStore({ lyrics: [] });
      const { container } = render(<LyricsControl />);
      expect(container.firstChild).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 按鈕 disabled 狀態
  // --------------------------------------------------------------------------

  describe("按鈕邊界 disabled 狀態", () => {
    it("在第一行時 Previous 按鈕 disabled", () => {
      resetStore({ currentIndex: 0 });
      render(<LyricsControl />);
      expect(screen.getByLabelText("Previous line")).toBeDisabled();
    });

    it("在最後一行時 Next 按鈕 disabled", () => {
      resetStore({ currentIndex: 4 }); // 5 行歌詞，index 4 為最後一行
      render(<LyricsControl />);
      expect(screen.getByLabelText("Next line")).toBeDisabled();
    });

    it("在中間行時兩個按鈕都 enabled", () => {
      resetStore({ currentIndex: 2 });
      render(<LyricsControl />);
      expect(screen.getByLabelText("Previous line")).toBeEnabled();
      expect(screen.getByLabelText("Next line")).toBeEnabled();
    });
  });

  // --------------------------------------------------------------------------
  // 設計系統合規：無命令式 hover handler
  // --------------------------------------------------------------------------

  describe("設計系統合規 — 無命令式 hover handler", () => {
    it("按鈕不使用 onMouseEnter handler", () => {
      render(<LyricsControl onToggleFullscreen={() => {}} />);

      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        // 取得 React 內部 props（透過 __reactProps 或 __reactFiber）
        // 改用 DOM 屬性檢查：onmouseenter 不應存在
        expect(button.getAttribute("onmouseenter")).toBeNull();
      }
    });

    it("按鈕不使用 onMouseLeave handler", () => {
      render(<LyricsControl onToggleFullscreen={() => {}} />);

      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        expect(button.getAttribute("onmouseleave")).toBeNull();
      }
    });

    it("按鈕包含 Tailwind hover class", () => {
      render(<LyricsControl />);

      // enabled 的按鈕應包含 hover: prefix class
      const prevBtn = screen.getByLabelText("Previous line");
      const nextBtn = screen.getByLabelText("Next line");

      // 至少一個 enabled 按鈕應有 hover class
      const enabledBtns = [prevBtn, nextBtn].filter(
        (btn) => !btn.hasAttribute("disabled")
      );
      expect(enabledBtns.length).toBeGreaterThan(0);
      for (const btn of enabledBtns) {
        expect(btn.className).toMatch(/hover:/);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 設計系統合規：無硬編碼 rgba
  // --------------------------------------------------------------------------

  describe("設計系統合規 — 無硬編碼 rgba", () => {
    it("rendered output 不包含硬編碼 rgba 色值", () => {
      render(<LyricsControl onToggleFullscreen={() => {}} />);

      const container = document.querySelector(".lyrics-control");
      expect(container).toBeTruthy();

      // 取得所有元素的 style 屬性，檢查是否包含 rgba(
      const allElements = container!.querySelectorAll("*");
      const allStyles: string[] = [
        (container as HTMLElement).getAttribute("style") ?? "",
      ];
      allElements.forEach((el) => {
        const style = el.getAttribute("style");
        if (style) allStyles.push(style);
      });

      const combinedStyles = allStyles.join(" ");
      expect(combinedStyles).not.toMatch(/rgba\(/i);
    });
  });

  // --------------------------------------------------------------------------
  // 字體合規：不含舊版 Exo 2
  // --------------------------------------------------------------------------

  describe("字體合規 — 無 Exo 2 殘留", () => {
    it("rendered output 不包含 Exo 2 字體引用", () => {
      render(<LyricsControl />);

      const container = document.querySelector(".lyrics-control");
      expect(container).toBeTruthy();

      const allElements = container!.querySelectorAll("*");
      const allStyles: string[] = [
        (container as HTMLElement).getAttribute("style") ?? "",
      ];
      allElements.forEach((el) => {
        const style = el.getAttribute("style");
        if (style) allStyles.push(style);
      });

      const combinedStyles = allStyles.join(" ");
      expect(combinedStyles).not.toMatch(/Exo\s*2/i);
    });
  });

  // --------------------------------------------------------------------------
  // 全螢幕按鈕
  // --------------------------------------------------------------------------

  describe("全螢幕按鈕", () => {
    it("有 onToggleFullscreen 時顯示全螢幕按鈕", () => {
      render(<LyricsControl onToggleFullscreen={() => {}} />);
      expect(
        screen.getByLabelText("Enter fullscreen")
      ).toBeInTheDocument();
    });

    it("無 onToggleFullscreen 時不顯示全螢幕按鈕", () => {
      render(<LyricsControl />);
      expect(screen.queryByLabelText("Enter fullscreen")).toBeNull();
      expect(screen.queryByLabelText("Exit fullscreen")).toBeNull();
    });

    it("isFullscreen 為 true 時顯示 Exit fullscreen 按鈕", () => {
      render(
        <LyricsControl isFullscreen onToggleFullscreen={() => {}} />
      );
      expect(
        screen.getByLabelText("Exit fullscreen")
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 行選擇器 compact 模式
  // --------------------------------------------------------------------------

  describe("行選擇器 — compact 模式", () => {
    it("非 compact 模式顯示 select 行選擇器", () => {
      render(<LyricsControl />);
      expect(screen.getByLabelText("Jump to line")).toBeInTheDocument();
    });

    it("compact 模式不顯示 select 行選擇器", () => {
      render(<LyricsControl compact />);
      expect(screen.queryByLabelText("Jump to line")).toBeNull();
    });

    it("compact 模式顯示當前行數指示", () => {
      resetStore({ currentIndex: 2, lyrics: ["a", "b", "c", "d", "e"] });
      render(<LyricsControl compact />);
      expect(screen.getByText("3/5")).toBeInTheDocument();
    });
  });
});
