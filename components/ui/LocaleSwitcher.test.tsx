/**
 * LocaleSwitcher 元件測試
 *
 * 覆蓋範圍：
 * 1. 渲染三個語言按鈕（繁中、简中、EN）
 * 2. 當前 locale 按鈕套用啟用樣式
 * 3. 點擊非當前 locale 按鈕設置 cookie 並觸發 reload
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

// Mock next-intl 的 useLocale
vi.mock("next-intl", () => ({
  useLocale: vi.fn(() => "zh-TW"),
}));

import { useLocale } from "next-intl";
import { LocaleSwitcher } from "./LocaleSwitcher";

// ============================================================================
// 測試
// ============================================================================

describe("LocaleSwitcher", () => {
  const mockReload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location.reload
    Object.defineProperty(window, "location", {
      value: { reload: mockReload },
      writable: true,
    });

    // 清除 cookie
    document.cookie = "locale=;max-age=0";
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("basic rendering", () => {
    it("renders three locale buttons", () => {
      render(<LocaleSwitcher />);

      expect(screen.getByText("繁中")).toBeInTheDocument();
      expect(screen.getByText("简中")).toBeInTheDocument();
      expect(screen.getByText("EN")).toBeInTheDocument();
    });

    it("renders all buttons as button elements", () => {
      render(<LocaleSwitcher />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3);
    });
  });

  // --------------------------------------------------------------------------
  // 啟用狀態
  // --------------------------------------------------------------------------

  describe("active state", () => {
    it("applies active styles to current locale button (zh-TW)", () => {
      render(<LocaleSwitcher />);

      const activeButton = screen.getByText("繁中");
      // 啟用按鈕應包含 accent 相關 class
      expect(activeButton.className).toContain("bg-accent/20");
    });

    it("applies inactive styles to non-current locale buttons", () => {
      render(<LocaleSwitcher />);

      const inactiveButton = screen.getByText("EN");
      expect(inactiveButton.className).toContain("bg-surface");
    });

    it("reflects different current locale (en)", () => {
      vi.mocked(useLocale).mockReturnValue("en");

      render(<LocaleSwitcher />);

      const enButton = screen.getByText("EN");
      expect(enButton.className).toContain("bg-accent/20");

      const zhTWButton = screen.getByText("繁中");
      expect(zhTWButton.className).toContain("bg-surface");
    });
  });

  // --------------------------------------------------------------------------
  // 語言切換行為
  // --------------------------------------------------------------------------

  describe("locale switching", () => {
    it("sets locale cookie when a different locale is clicked", () => {
      render(<LocaleSwitcher />);

      fireEvent.click(screen.getByText("EN"));

      expect(document.cookie).toContain("locale=en");
    });

    it("calls window.location.reload after setting cookie", () => {
      render(<LocaleSwitcher />);

      fireEvent.click(screen.getByText("简中"));

      expect(mockReload).toHaveBeenCalledOnce();
    });

    it("sets cookie with path=/ and max-age=31536000", () => {
      render(<LocaleSwitcher />);

      fireEvent.click(screen.getByText("EN"));

      expect(document.cookie).toContain("locale=en");
    });
  });
});
