/**
 * ConnectionIndicator 元件測試
 *
 * 測試各連線狀態下的渲染行為，以及確認無硬編碼色值。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// 模擬 next-intl
vi.mock("next-intl", async () => {
  const { createNextIntlMock } = await import("@/lib/test-utils/i18n-mock");
  return createNextIntlMock();
});

// ============================================================================
// Mock 設定
// ============================================================================

const mockStoreState = new Map<string, unknown>([
  ["connectionState", "connected"],
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

// 載入元件
import { ConnectionIndicator } from "./ConnectionIndicator";

describe("ConnectionIndicator", () => {
  beforeEach(() => {
    mockStoreState.set("connectionState", "connected");
  });

  // ========================================================================
  // 各狀態標籤
  // ========================================================================

  it("connected 狀態顯示「已連接」", () => {
    render(<ConnectionIndicator />);
    expect(screen.getByText("已連接")).toBeInTheDocument();
  });

  it("reconnecting 狀態顯示「重連中」", () => {
    mockStoreState.set("connectionState", "reconnecting");
    render(<ConnectionIndicator />);
    expect(screen.getByText("重連中")).toBeInTheDocument();
  });

  it("disconnected 狀態顯示「已離線」", () => {
    mockStoreState.set("connectionState", "disconnected");
    render(<ConnectionIndicator />);
    expect(screen.getByText("已離線")).toBeInTheDocument();
  });

  // ========================================================================
  // 語意 class 驗證
  // ========================================================================

  it("connected 狀態使用 accent 語意色 class", () => {
    const { container } = render(<ConnectionIndicator />);
    const html = container.innerHTML;
    expect(html).toContain("bg-accent");
    expect(html).toContain("text-accent");
  });

  it("reconnecting 狀態使用 warning 語意色 class", () => {
    mockStoreState.set("connectionState", "reconnecting");
    const { container } = render(<ConnectionIndicator />);
    const html = container.innerHTML;
    expect(html).toContain("bg-warning");
    expect(html).toContain("text-warning");
  });

  it("disconnected 狀態使用 error 語意色 class", () => {
    mockStoreState.set("connectionState", "disconnected");
    const { container } = render(<ConnectionIndicator />);
    const html = container.innerHTML;
    expect(html).toContain("bg-error");
    expect(html).toContain("text-error");
  });

  it("connected 狀態使用 shadow-glow-accent 而非 shadow-glow-secondary", () => {
    const { container } = render(<ConnectionIndicator />);
    const outerDiv = container.firstElementChild;
    expect(outerDiv?.className).toContain("shadow-glow-accent");
    expect(outerDiv?.className).not.toContain("shadow-glow-secondary");
  });

  // ========================================================================
  // 無硬編碼色值
  // ========================================================================

  it("connected 渲染結果不包含硬編碼 hex/rgba 色值", () => {
    const { container } = render(<ConnectionIndicator />);
    const html = container.innerHTML;
    const hexPattern = /#(?!000000)[0-9a-fA-F]{3,8}/g;
    const rgbaPattern = /rgba?\(\s*\d/g;
    expect(html).not.toMatch(hexPattern);
    expect(html).not.toMatch(rgbaPattern);
  });

  it("reconnecting 渲染結果不包含硬編碼 hex/rgba 色值", () => {
    mockStoreState.set("connectionState", "reconnecting");
    const { container } = render(<ConnectionIndicator />);
    const html = container.innerHTML;
    const hexPattern = /#(?!000000)[0-9a-fA-F]{3,8}/g;
    const rgbaPattern = /rgba?\(\s*\d/g;
    expect(html).not.toMatch(hexPattern);
    expect(html).not.toMatch(rgbaPattern);
  });

  it("disconnected 渲染結果不包含硬編碼 hex/rgba 色值", () => {
    mockStoreState.set("connectionState", "disconnected");
    const { container } = render(<ConnectionIndicator />);
    const html = container.innerHTML;
    const hexPattern = /#(?!000000)[0-9a-fA-F]{3,8}/g;
    const rgbaPattern = /rgba?\(\s*\d/g;
    expect(html).not.toMatch(hexPattern);
    expect(html).not.toMatch(rgbaPattern);
  });

  // ========================================================================
  // 無 inline style 色值
  // ========================================================================

  it("不使用 inline style 設定色值", () => {
    const { container } = render(<ConnectionIndicator />);
    const allElements = container.querySelectorAll("*");
    allElements.forEach((el) => {
      const style = el.getAttribute("style");
      if (style) {
        expect(style).not.toContain("backgroundColor");
        expect(style).not.toContain("background-color");
        expect(style).not.toContain("color:");
        expect(style).not.toContain("borderColor");
        expect(style).not.toContain("border-color");
      }
    });
  });

  // ========================================================================
  // 接受 className prop
  // ========================================================================

  it("接受外部 className", () => {
    const { container } = render(<ConnectionIndicator className="my-extra" />);
    expect(container.firstElementChild?.className).toContain("my-extra");
  });
});
