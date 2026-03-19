/**
 * ConnectionStatusBar 元件測試
 *
 * 測試各連線狀態下的渲染行為，以及確認無硬編碼色值。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve } from "path";

// 模擬 next-intl
vi.mock("next-intl", async () => {
  const { createNextIntlMock } = await import("@/lib/test-utils/i18n-mock");
  return createNextIntlMock();
});

// ============================================================================
// Mock 設定
// ============================================================================

const mockStoreState = new Map<string, unknown>([
  ["connectionState", "disconnected"],
  ["reconnectAttempt", 0],
  ["retryConnection", vi.fn()],
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

// Mock useOnlineStatus — 預設線上
let mockOnlineStatus = true;
vi.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => mockOnlineStatus,
}));

// 載入元件
import { ConnectionStatusBar } from "./ConnectionStatusBar";

describe("ConnectionStatusBar", () => {
  beforeEach(() => {
    mockStoreState.set("connectionState", "disconnected");
    mockStoreState.set("reconnectAttempt", 0);
    mockStoreState.set("retryConnection", vi.fn());
    mockOnlineStatus = true;
  });

  // ========================================================================
  // disconnected 狀態
  // ========================================================================

  it("disconnected 狀態顯示「無法連線」文字", () => {
    render(<ConnectionStatusBar />);
    expect(screen.getByText("無法連線")).toBeInTheDocument();
  });

  it("disconnected 狀態顯示重試按鈕", () => {
    render(<ConnectionStatusBar />);
    expect(screen.getByText("重試")).toBeInTheDocument();
  });

  it("點擊重試按鈕呼叫 retryConnection", () => {
    const retryFn = vi.fn();
    mockStoreState.set("retryConnection", retryFn);
    render(<ConnectionStatusBar />);
    fireEvent.click(screen.getByText("重試"));
    expect(retryFn).toHaveBeenCalledTimes(1);
  });

  // ========================================================================
  // reconnecting 狀態
  // ========================================================================

  it("reconnecting 狀態顯示重試次數", () => {
    mockStoreState.set("connectionState", "reconnecting");
    mockStoreState.set("reconnectAttempt", 3);
    render(<ConnectionStatusBar />);
    expect(screen.getByText(/重新連接中.*3/)).toBeInTheDocument();
  });

  it("reconnecting 狀態不顯示重試按鈕", () => {
    mockStoreState.set("connectionState", "reconnecting");
    render(<ConnectionStatusBar />);
    expect(screen.queryByText("重試")).not.toBeInTheDocument();
  });

  // ========================================================================
  // connected 狀態
  // ========================================================================

  it("connected 狀態且無恢復提示時不渲染任何內容", () => {
    mockStoreState.set("connectionState", "connected");
    const { container } = render(<ConnectionStatusBar />);
    expect(container.innerHTML).toBe("");
  });

  // ========================================================================
  // 無硬編碼色值
  // ========================================================================

  it("disconnected 渲染結果不包含硬編碼 hex/rgba 色值", () => {
    const { container } = render(<ConnectionStatusBar />);
    const html = container.innerHTML;
    // 排除 Clean Output 允許的 #000000
    const hexPattern = /#(?!000000)[0-9a-fA-F]{3,8}/g;
    const rgbaPattern = /rgba?\(\s*\d/g;
    expect(html).not.toMatch(hexPattern);
    expect(html).not.toMatch(rgbaPattern);
  });

  it("reconnecting 渲染結果不包含硬編碼 hex/rgba 色值", () => {
    mockStoreState.set("connectionState", "reconnecting");
    mockStoreState.set("reconnectAttempt", 2);
    const { container } = render(<ConnectionStatusBar />);
    const html = container.innerHTML;
    const hexPattern = /#(?!000000)[0-9a-fA-F]{3,8}/g;
    const rgbaPattern = /rgba?\(\s*\d/g;
    expect(html).not.toMatch(hexPattern);
    expect(html).not.toMatch(rgbaPattern);
  });

  // ========================================================================
  // 離線模式 (NFR2.4)
  // ========================================================================

  it("離線時顯示「離線模式」提示", () => {
    mockOnlineStatus = false;
    mockStoreState.set("connectionState", "connected");
    render(<ConnectionStatusBar />);
    expect(screen.getByText("離線模式")).toBeInTheDocument();
  });

  it("離線提示包含「歌詞將停留在最後位置」說明文字", () => {
    mockOnlineStatus = false;
    mockStoreState.set("connectionState", "connected");
    render(<ConnectionStatusBar />);
    expect(screen.getByText(/歌詞將停留在最後位置/)).toBeInTheDocument();
  });

  it("離線提示優先於 connected 狀態的隱藏邏輯", () => {
    mockOnlineStatus = false;
    mockStoreState.set("connectionState", "connected");
    const { container } = render(<ConnectionStatusBar />);
    // connected 正常情況下 container 為空，但離線時應有內容
    expect(container.innerHTML).not.toBe("");
  });

  it("離線提示渲染結果不包含硬編碼 hex/rgba 色值", () => {
    mockOnlineStatus = false;
    mockStoreState.set("connectionState", "connected");
    const { container } = render(<ConnectionStatusBar />);
    const html = container.innerHTML;
    const hexPattern = /#(?!000000)[0-9a-fA-F]{3,8}/g;
    const rgbaPattern = /rgba?\(\s*\d/g;
    expect(html).not.toMatch(hexPattern);
    expect(html).not.toMatch(rgbaPattern);
  });

  it("使用 animate-fade-out-slow 而非 arbitrary animation", () => {
    // 原始碼若仍使用 animate-[fadeOut_2s...] 則此測試失敗
    // 因為我們無法在 connected 恢復提示的情境中直接測 DOM class，
    // 所以改為靜態檢查原始碼
    // 此處透過 import 後檢查渲染的 class
    // 需要觸發 connected 恢復情境 — 難以在 unit test 觸發
    // 改為直接讀取原始碼做靜態檢查
    const source = readFileSync(
      resolve(__dirname, "ConnectionStatusBar.tsx"),
      "utf-8"
    );
    expect(source).not.toContain("animate-[");
    expect(source).toContain("animate-fade-out-slow");
  });
});
