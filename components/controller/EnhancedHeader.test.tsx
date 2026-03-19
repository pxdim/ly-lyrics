/**
 * EnhancedHeader 元件測試
 *
 * 基於 ControllerHeader 的 StatusBar 增強版本。
 * 新增佈局模板選擇器、鎖定按鈕、當前歌曲資訊等。
 *
 * 測試內容：
 * 1. 房間碼渲染
 * 2. 連線狀態顯示
 * 3. 裝置計數
 * 4. 當前歌曲資訊
 * 5. 佈局模板選擇器
 * 6. 鎖定按鈕
 * 7. 設計系統合規
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

// Mock next-intl — 使用真實 zh-TW 翻譯
vi.mock("next-intl", async () => {
  const { createNextIntlMock } = await import("@/lib/test-utils/i18n-mock");
  return createNextIntlMock();
});

// Mock useLyricsStore — 使用 Map 供動態調整
const mockLyricsState = new Map<string, unknown>([
  ["connectionState", "connected"],
  ["controllerCount", 1],
  ["displayCount", 2],
  ["currentSong", { title: "你敢不敢", artist: "徐佳瑩" }],
]);

vi.mock("@/lib/store", () => ({
  useLyricsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const stateObj: Record<string, unknown> = {};
    mockLyricsState.forEach((value, key) => {
      stateObj[key] = value;
    });
    return selector(stateObj);
  },
}));

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

// Mock QRCodePanel
vi.mock("@/components/controller/QRCodePanel", () => ({
  QRCodePanel: ({
    sessionCode,
    size,
  }: {
    sessionCode: string;
    size?: number;
  }) => (
    <div
      data-testid="qrcode-panel"
      data-session-code={sessionCode}
      data-size={size}
    />
  ),
}));

import { EnhancedHeader } from "./EnhancedHeader";

// ============================================================================
// 測試輔助
// ============================================================================

function resetMockLyricsState(overrides: Record<string, unknown> = {}) {
  mockLyricsState.set("connectionState", "connected");
  mockLyricsState.set("controllerCount", 1);
  mockLyricsState.set("displayCount", 2);
  mockLyricsState.set("currentSong", {
    title: "你敢不敢",
    artist: "徐佳瑩",
  });
  for (const [key, value] of Object.entries(overrides)) {
    mockLyricsState.set(key, value);
  }
}

function resetMockLayoutState(overrides: Record<string, unknown> = {}) {
  mockLayoutState.set("currentPreset", "standard");
  mockLayoutState.set("isLocked", false);
  mockLayoutState.set("toggleLock", mockToggleLock);
  mockLayoutState.set("applyPreset", mockApplyPreset);
  for (const [key, value] of Object.entries(overrides)) {
    mockLayoutState.set(key, value);
  }
}

const defaultProps = {
  sessionCode: "ABC123",
  onRegenerate: vi.fn(),
};

// ============================================================================
// 測試
// ============================================================================

describe("EnhancedHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockLyricsState();
    resetMockLayoutState();

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  // --------------------------------------------------------------------------
  // 房間碼
  // --------------------------------------------------------------------------

  describe("房間碼渲染", () => {
    it("renders room code", () => {
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByText("ABC123")).toBeInTheDocument();
    });

    it("renders Room label", () => {
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByText("Room")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 連線狀態
  // --------------------------------------------------------------------------

  describe("連線狀態", () => {
    it("shows connected status text when connected", () => {
      resetMockLyricsState({ connectionState: "connected" });
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByText("SYSTEM READY")).toBeInTheDocument();
    });

    it("shows offline status text when disconnected", () => {
      resetMockLyricsState({ connectionState: "disconnected" });
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByText("OFFLINE")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 裝置計數
  // --------------------------------------------------------------------------

  describe("裝置計數", () => {
    it("renders controller count", () => {
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByText("CTL: 1")).toBeInTheDocument();
    });

    it("renders display count", () => {
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByText("DSP: 2")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 當前歌曲資訊
  // --------------------------------------------------------------------------

  describe("當前歌曲", () => {
    it("renders current song title and artist", () => {
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByText("你敢不敢 — 徐佳瑩")).toBeInTheDocument();
    });

    it("does not show song info when no song selected", () => {
      resetMockLyricsState({ currentSong: null });
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.queryByText(/—/)).not.toBeInTheDocument();
    });

    it("shows only title when artist is empty", () => {
      resetMockLyricsState({
        currentSong: { title: "奇異恩典", artist: "" },
      });
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByText("奇異恩典")).toBeInTheDocument();
      expect(screen.queryByText(/—/)).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 佈局模板選擇器
  // --------------------------------------------------------------------------

  describe("佈局模板選擇器", () => {
    it("renders current preset name", () => {
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByText("STANDARD")).toBeInTheDocument();
    });

    it("renders focus preset when selected", () => {
      resetMockLayoutState({ currentPreset: "focus" });
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByText("FOCUS")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 鎖定按鈕
  // --------------------------------------------------------------------------

  describe("鎖定按鈕", () => {
    it("renders lock button with unlock title when unlocked", () => {
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByTitle("鎖定佈局")).toBeInTheDocument();
    });

    it("renders lock button with lock title when locked", () => {
      resetMockLayoutState({ isLocked: true });
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByTitle("解鎖佈局")).toBeInTheDocument();
    });

    it("calls toggleLock when lock button is clicked", () => {
      render(<EnhancedHeader {...defaultProps} />);
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
      const { container } = render(<EnhancedHeader {...defaultProps} />);
      const allElements = container.querySelectorAll("*");
      const allStyles: string[] = [];
      allElements.forEach((el) => {
        const style = el.getAttribute("style");
        if (style) allStyles.push(style);
      });
      const combinedStyles = allStyles.join(" ");
      expect(combinedStyles).not.toMatch(/rgba\(/i);
    });

    it("renders inside a header element", () => {
      render(<EnhancedHeader {...defaultProps} />);
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });
  });
});
