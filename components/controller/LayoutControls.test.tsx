/**
 * LayoutControls 元件測試
 *
 * 從 EnhancedHeader 提取的佈局控制元件，包含：
 * 1. 佈局模板選擇器（STANDARD / FOCUS / FULL / MINIMAL）
 * 2. 鎖定/解鎖按鈕
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

// Mock next-intl
vi.mock("next-intl", async () => {
  const { createNextIntlMock } = await import("@/lib/test-utils/i18n-mock");
  return createNextIntlMock();
});

// Mock useLayoutStore
const mockToggleLock = vi.fn();
const mockApplyPreset = vi.fn();

const mockLayoutState = new Map<string, unknown>([
  ["currentPreset", "standard"],
  ["isLocked", false],
  ["toggleLock", mockToggleLock],
  ["applyPreset", mockApplyPreset],
]);

vi.mock("@/lib/store/layout-store", () => ({
  useLayoutStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const stateObj: Record<string, unknown> = {};
    mockLayoutState.forEach((value, key) => {
      stateObj[key] = value;
    });
    return selector(stateObj);
  },
}));

import { LayoutControls } from "./LayoutControls";

// ============================================================================
// 測試輔助
// ============================================================================

function resetMockLayoutState(overrides: Record<string, unknown> = {}) {
  mockLayoutState.set("currentPreset", "standard");
  mockLayoutState.set("isLocked", false);
  mockLayoutState.set("toggleLock", mockToggleLock);
  mockLayoutState.set("applyPreset", mockApplyPreset);
  for (const [key, value] of Object.entries(overrides)) {
    mockLayoutState.set(key, value);
  }
}

// ============================================================================
// 測試
// ============================================================================

describe("LayoutControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockLayoutState();
  });

  // --------------------------------------------------------------------------
  // 佈局模板選擇器
  // --------------------------------------------------------------------------

  describe("佈局模板選擇器", () => {
    it("renders current preset name", () => {
      render(<LayoutControls />);
      expect(screen.getByText("STANDARD")).toBeInTheDocument();
    });

    it("renders focus preset when selected", () => {
      resetMockLayoutState({ currentPreset: "focus" });
      render(<LayoutControls />);
      expect(screen.getByText("FOCUS")).toBeInTheDocument();
    });

    it("shows preset options when preset button is clicked", () => {
      render(<LayoutControls />);
      const presetButton = screen.getByText("STANDARD").closest("button")!;
      fireEvent.click(presetButton);

      expect(screen.getByText("FOCUS")).toBeInTheDocument();
      expect(screen.getByText("FULL")).toBeInTheDocument();
      expect(screen.getByText("MINIMAL")).toBeInTheDocument();
    });

    it("calls applyPreset when a preset option is clicked", () => {
      render(<LayoutControls />);
      const presetButton = screen.getByText("STANDARD").closest("button")!;
      fireEvent.click(presetButton);

      const focusOption = screen.getAllByText("FOCUS").find(
        (el) => el.tagName === "BUTTON",
      )!;
      fireEvent.click(focusOption);

      expect(mockApplyPreset).toHaveBeenCalledWith("focus");
    });

    it("hides preset dropdown after selecting an option", () => {
      render(<LayoutControls />);
      const presetButton = screen.getByText("STANDARD").closest("button")!;
      fireEvent.click(presetButton);

      const fullOption = screen.getAllByText("FULL").find(
        (el) => el.tagName === "BUTTON",
      )!;
      fireEvent.click(fullOption);

      // 下拉選項 MINIMAL 不再可見（因為已關閉）
      // 注意：STANDARD 仍為觸發按鈕文字，故只檢查 MINIMAL
      expect(screen.queryByText("MINIMAL")).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 鎖定按鈕
  // --------------------------------------------------------------------------

  describe("鎖定按鈕", () => {
    it("renders unlock title when unlocked", () => {
      render(<LayoutControls />);
      expect(screen.getByTitle("鎖定佈局")).toBeInTheDocument();
    });

    it("renders lock title when locked", () => {
      resetMockLayoutState({ isLocked: true });
      render(<LayoutControls />);
      expect(screen.getByTitle("解鎖佈局")).toBeInTheDocument();
    });

    it("calls toggleLock when lock button is clicked", () => {
      render(<LayoutControls />);
      const lockBtn = screen.getByTitle("鎖定佈局");
      fireEvent.click(lockBtn);
      expect(mockToggleLock).toHaveBeenCalledOnce();
    });
  });

  // --------------------------------------------------------------------------
  // 設計系統合規
  // --------------------------------------------------------------------------

  describe("設計系統合規", () => {
    it("does not contain hardcoded rgba values in inline styles", () => {
      const { container } = render(<LayoutControls />);
      const allElements = container.querySelectorAll("*");
      const allStyles: string[] = [];
      allElements.forEach((el) => {
        const style = el.getAttribute("style");
        if (style) allStyles.push(style);
      });
      const combinedStyles = allStyles.join(" ");
      expect(combinedStyles).not.toMatch(/rgba\(/i);
    });
  });
});
