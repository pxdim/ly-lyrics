/**
 * MobileTabBar 元件測試
 *
 * 測試內容：
 * 1. 基本渲染：四個 tab 按鈕都存在
 * 2. Tab 切換回呼：點擊 tab 觸發 onTabChange
 * 3. Active tab 視覺狀態區別：啟用分頁有指示線和顏色區分
 * 4. 設計系統合規：無硬編碼 rgba
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileTabBar, type MobileTab } from "./MobileTabBar";

// ============================================================================
// 測試
// ============================================================================

describe("MobileTabBar", () => {
  const defaultProps = {
    activeTab: "songs" as MobileTab,
    onTabChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("renders all tab buttons", () => {
    it("renders four tab buttons", () => {
      render(<MobileTabBar {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(4);
    });

    it("renders songs tab label", () => {
      render(<MobileTabBar {...defaultProps} />);
      expect(screen.getByText("歌曲")).toBeInTheDocument();
    });

    it("renders lyrics tab label", () => {
      render(<MobileTabBar {...defaultProps} />);
      expect(screen.getByText("歌詞")).toBeInTheDocument();
    });

    it("renders settings tab label", () => {
      render(<MobileTabBar {...defaultProps} />);
      expect(screen.getByText("設定")).toBeInTheDocument();
    });

    it("renders QR tab label", () => {
      render(<MobileTabBar {...defaultProps} />);
      expect(screen.getByText("QR")).toBeInTheDocument();
    });

    it("renders inside a nav element for semantic HTML", () => {
      render(<MobileTabBar {...defaultProps} />);
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Tab 切換回呼
  // --------------------------------------------------------------------------

  describe("tab change callback", () => {
    it("calls onTabChange with 'songs' when songs tab is clicked", () => {
      const onTabChange = vi.fn();
      render(<MobileTabBar activeTab="lyrics" onTabChange={onTabChange} />);
      fireEvent.click(screen.getByText("歌曲"));
      expect(onTabChange).toHaveBeenCalledWith("songs");
    });

    it("calls onTabChange with 'lyrics' when lyrics tab is clicked", () => {
      const onTabChange = vi.fn();
      render(<MobileTabBar activeTab="songs" onTabChange={onTabChange} />);
      fireEvent.click(screen.getByText("歌詞"));
      expect(onTabChange).toHaveBeenCalledWith("lyrics");
    });

    it("calls onTabChange with 'settings' when settings tab is clicked", () => {
      const onTabChange = vi.fn();
      render(<MobileTabBar activeTab="songs" onTabChange={onTabChange} />);
      fireEvent.click(screen.getByText("設定"));
      expect(onTabChange).toHaveBeenCalledWith("settings");
    });

    it("calls onTabChange with 'qr' when QR tab is clicked", () => {
      const onTabChange = vi.fn();
      render(<MobileTabBar activeTab="songs" onTabChange={onTabChange} />);
      fireEvent.click(screen.getByText("QR"));
      expect(onTabChange).toHaveBeenCalledWith("qr");
    });

    it("calls onTabChange exactly once per click", () => {
      const onTabChange = vi.fn();
      render(<MobileTabBar activeTab="songs" onTabChange={onTabChange} />);
      fireEvent.click(screen.getByText("歌詞"));
      expect(onTabChange).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // Active tab 視覺狀態
  // --------------------------------------------------------------------------

  describe("active tab visual state", () => {
    it("active tab button has text-primary class", () => {
      render(<MobileTabBar activeTab="songs" onTabChange={vi.fn()} />);
      const songsButton = screen.getByText("歌曲").closest("button");
      expect(songsButton?.className).toContain("text-primary");
    });

    it("inactive tab button has text-text-muted class", () => {
      render(<MobileTabBar activeTab="songs" onTabChange={vi.fn()} />);
      const lyricsButton = screen.getByText("歌詞").closest("button");
      expect(lyricsButton?.className).toContain("text-text-muted");
    });

    it("active tab shows top indicator line", () => {
      render(<MobileTabBar activeTab="lyrics" onTabChange={vi.fn()} />);
      const lyricsButton = screen.getByText("歌詞").closest("button");
      // 指示線是 active button 內的 div 元素，具有 bg-primary class
      const indicator = lyricsButton?.querySelector("div.bg-primary");
      expect(indicator).toBeTruthy();
    });

    it("inactive tab does not show top indicator line", () => {
      render(<MobileTabBar activeTab="lyrics" onTabChange={vi.fn()} />);
      const songsButton = screen.getByText("歌曲").closest("button");
      const indicator = songsButton?.querySelector("div.bg-primary");
      expect(indicator).toBeNull();
    });

    it("switching active tab changes visual state correctly", () => {
      const { rerender } = render(
        <MobileTabBar activeTab="songs" onTabChange={vi.fn()} />,
      );

      // 確認 songs 是 active
      const songsButton = screen.getByText("歌曲").closest("button");
      expect(songsButton?.className).toContain("text-primary");

      // 切換到 settings
      rerender(
        <MobileTabBar activeTab="settings" onTabChange={vi.fn()} />,
      );

      const settingsButton = screen.getByText("設定").closest("button");
      expect(settingsButton?.className).toContain("text-primary");

      // songs 應該變成 inactive
      const updatedSongsButton = screen.getByText("歌曲").closest("button");
      expect(updatedSongsButton?.className).toContain("text-text-muted");
    });
  });

  // --------------------------------------------------------------------------
  // 設計系統合規
  // --------------------------------------------------------------------------

  describe("design system compliance", () => {
    it("does not contain hardcoded rgba values in inline styles", () => {
      const { container } = render(
        <MobileTabBar {...defaultProps} />,
      );
      const allElements = container.querySelectorAll("*");
      const allStyles: string[] = [];
      allElements.forEach((el) => {
        const style = el.getAttribute("style");
        if (style) allStyles.push(style);
      });
      const combinedStyles = allStyles.join(" ");
      expect(combinedStyles).not.toMatch(/rgba\(/i);
    });

    it("does not contain hardcoded hex color values in inline styles", () => {
      const { container } = render(
        <MobileTabBar {...defaultProps} />,
      );
      const allElements = container.querySelectorAll("*");
      const allStyles: string[] = [];
      allElements.forEach((el) => {
        const style = el.getAttribute("style");
        if (style) allStyles.push(style);
      });
      const combinedStyles = allStyles.join(" ");
      expect(combinedStyles).not.toMatch(/#[0-9a-f]{3,8}/i);
    });

    it("all buttons have minimum touch target size class", () => {
      render(<MobileTabBar {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        // 每個按鈕應有 min-h-[44px] 符合觸控目標最低要求
        expect(button.className).toContain("min-h-[44px]");
      }
    });
  });
});
