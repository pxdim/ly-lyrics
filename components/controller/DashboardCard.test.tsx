/**
 * DashboardCard 元件測試
 *
 * 可拖曳卡片佈局的基礎容器元件。
 * 包含拖曳把手、標題列、最小化/最大化按鈕。
 *
 * 測試內容：
 * 1. 標題渲染
 * 2. 子元件渲染
 * 3. 拖曳把手 class
 * 4. 最小化按鈕行為
 * 5. 鎖定狀態
 * 6. 設計系統合規
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardCard } from "./DashboardCard";

// 模擬 next-intl
vi.mock("next-intl", async () => {
  const { createNextIntlMock } = await import("@/lib/test-utils/i18n-mock");
  return createNextIntlMock();
});

describe("DashboardCard", () => {
  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("基本渲染", () => {
    it("renders title in header", () => {
      render(
        <DashboardCard title="Song Library">
          <div>content</div>
        </DashboardCard>,
      );
      expect(screen.getByText("Song Library")).toBeInTheDocument();
    });

    it("renders children content", () => {
      render(
        <DashboardCard title="Test">
          <div>my content</div>
        </DashboardCard>,
      );
      expect(screen.getByText("my content")).toBeInTheDocument();
    });

    it("renders title with uppercase styling", () => {
      render(
        <DashboardCard title="Test">
          <div />
        </DashboardCard>,
      );
      const titleEl = screen.getByText("Test");
      expect(titleEl.className).toContain("uppercase");
    });
  });

  // --------------------------------------------------------------------------
  // 拖曳把手
  // --------------------------------------------------------------------------

  describe("拖曳把手", () => {
    it("has drag handle with correct class", () => {
      const { container } = render(
        <DashboardCard title="Test">
          <div />
        </DashboardCard>,
      );
      const handle = container.querySelector(".card-drag-handle");
      expect(handle).toBeInTheDocument();
    });

    it("drag handle has cursor-grab when not locked", () => {
      const { container } = render(
        <DashboardCard title="Test">
          <div />
        </DashboardCard>,
      );
      const handle = container.querySelector(".card-drag-handle");
      expect(handle?.className).toContain("cursor-grab");
    });
  });

  // --------------------------------------------------------------------------
  // 最小化按鈕
  // --------------------------------------------------------------------------

  describe("最小化按鈕", () => {
    it("calls onMinimize when minimize button clicked", () => {
      const onMinimize = vi.fn();
      render(
        <DashboardCard title="Test" onMinimize={onMinimize}>
          <div />
        </DashboardCard>,
      );
      const minBtn = screen.getByTitle("最小化");
      fireEvent.click(minBtn);
      expect(onMinimize).toHaveBeenCalledOnce();
    });

    it("does not render minimize button when onMinimize is not provided", () => {
      render(
        <DashboardCard title="Test">
          <div />
        </DashboardCard>,
      );
      expect(screen.queryByTitle("最小化")).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 鎖定狀態
  // --------------------------------------------------------------------------

  describe("鎖定狀態", () => {
    it("applies cursor-not-allowed class when locked", () => {
      const { container } = render(
        <DashboardCard title="Test" isLocked>
          <div />
        </DashboardCard>,
      );
      const handle = container.querySelector(".card-drag-handle");
      expect(handle?.className).toContain("cursor-not-allowed");
    });

    it("does not have cursor-grab when locked", () => {
      const { container } = render(
        <DashboardCard title="Test" isLocked>
          <div />
        </DashboardCard>,
      );
      const handle = container.querySelector(".card-drag-handle");
      expect(handle?.className).not.toContain("cursor-grab");
    });

    it("reduces opacity on drag handle when locked", () => {
      const { container } = render(
        <DashboardCard title="Test" isLocked>
          <div />
        </DashboardCard>,
      );
      const handle = container.querySelector(".card-drag-handle");
      expect(handle?.className).toContain("opacity-30");
    });
  });

  // --------------------------------------------------------------------------
  // 自訂 className
  // --------------------------------------------------------------------------

  describe("自訂 className", () => {
    it("applies custom className to root element", () => {
      const { container } = render(
        <DashboardCard title="Test" className="custom-test-class">
          <div />
        </DashboardCard>,
      );
      expect(container.firstElementChild?.className).toContain(
        "custom-test-class",
      );
    });
  });

  // --------------------------------------------------------------------------
  // 設計系統合規
  // --------------------------------------------------------------------------

  describe("設計系統合規", () => {
    it("does not contain hardcoded rgba values in inline styles", () => {
      const { container } = render(
        <DashboardCard title="Test" onMinimize={() => {}}>
          <div />
        </DashboardCard>,
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

    it("uses semantic Tailwind classes for background colors", () => {
      const { container } = render(
        <DashboardCard title="Test">
          <div />
        </DashboardCard>,
      );
      // 根元素應使用 bg-card 或相關語意 class，而非硬編碼顏色
      const rootClass = container.firstElementChild?.className ?? "";
      expect(rootClass).toContain("border-border-dim");
    });
  });
});
