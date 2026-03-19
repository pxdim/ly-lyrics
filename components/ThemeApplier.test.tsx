/**
 * ThemeApplier 元件測試
 *
 * 覆蓋範圍：
 * 1. 根據 store 的 displaySettings.theme 設定 document.documentElement 的 data-theme 屬性
 * 2. theme 為 "dark" 時設定 data-theme="dark"
 * 3. theme 為 "light" 時設定 data-theme="light"
 * 4. theme 變更時即時更新 data-theme 屬性
 * 5. 元件不渲染任何 DOM 內容（回傳 null）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

let currentTheme = "dark";

vi.mock("@/lib/store", () => ({
  useLyricsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    return selector({
      displaySettings: { theme: currentTheme },
    });
  },
}));

import { ThemeApplier } from "./ThemeApplier";

// ============================================================================
// 測試
// ============================================================================

describe("ThemeApplier", () => {
  beforeEach(() => {
    currentTheme = "dark";
    // 清除 data-theme 屬性
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("根據 store theme='dark' 設定 data-theme='dark'", () => {
    currentTheme = "dark";

    render(<ThemeApplier />);

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("根據 store theme='light' 設定 data-theme='light'", () => {
    currentTheme = "light";

    render(<ThemeApplier />);

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("不渲染任何 DOM 內容", () => {
    currentTheme = "dark";

    const { container } = render(<ThemeApplier />);

    expect(container.innerHTML).toBe("");
  });
});
