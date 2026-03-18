/**
 * ControllerHeader 元件測試
 *
 * 涵蓋三個匯出元件：StatusBar、MobileStatusBar、MobileQRTab
 *
 * 測試內容：
 * 1. StatusBar：房間碼顯示、連線狀態、裝置計數、複製房間碼、複製連結、重新產生、QR 按鈕
 * 2. MobileStatusBar：房間碼顯示、連線狀態文字、複製房間碼
 * 3. MobileQRTab：QR Code 面板、複製連結、重新產生按鈕
 * 4. 設計系統合規：無硬編碼 rgba
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

const mockStoreState = new Map<string, unknown>([
  ["connectionState", "connected"],
  ["controllerCount", 1],
  ["displayCount", 2],
  ["currentSong", null],
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

// Mock QRCodePanel（避免 qrcode.react 依賴）
vi.mock("@/components/controller/QRCodePanel", () => ({
  QRCodePanel: ({ sessionCode, size }: { sessionCode: string; size?: number }) => (
    <div data-testid="qrcode-panel" data-session-code={sessionCode} data-size={size} />
  ),
}));

import { StatusBar, MobileStatusBar, MobileQRTab } from "./ControllerHeader";

// ============================================================================
// 測試輔助
// ============================================================================

function resetStore(overrides: Record<string, unknown> = {}) {
  mockStoreState.set("connectionState", "connected");
  mockStoreState.set("controllerCount", 1);
  mockStoreState.set("displayCount", 2);
  mockStoreState.set("currentSong", null);
  for (const [key, value] of Object.entries(overrides)) {
    mockStoreState.set(key, value);
  }
}

// ============================================================================
// StatusBar 測試
// ============================================================================

describe("StatusBar", () => {
  const defaultProps = {
    sessionCode: "AB1234",
    onRegenerate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("basic rendering", () => {
    it("renders the Control Desk heading", () => {
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Control Desk")).toBeInTheDocument();
    });

    it("renders the session code", () => {
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("AB1234")).toBeInTheDocument();
    });

    it("renders the Room label", () => {
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Room")).toBeInTheDocument();
    });

    it("renders inside a header element", () => {
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 連線狀態
  // --------------------------------------------------------------------------

  describe("connection status", () => {
    it("shows SYSTEM READY when connected", () => {
      resetStore({ connectionState: "connected" });
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("SYSTEM READY")).toBeInTheDocument();
    });

    it("shows OFFLINE when disconnected", () => {
      resetStore({ connectionState: "disconnected" });
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("OFFLINE")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 裝置計數
  // --------------------------------------------------------------------------

  describe("device counts", () => {
    it("displays controller count", () => {
      resetStore({ controllerCount: 3 });
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("CTL: 3")).toBeInTheDocument();
    });

    it("displays display count", () => {
      resetStore({ displayCount: 5 });
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("DSP: 5")).toBeInTheDocument();
    });

    it("shows zero counts correctly", () => {
      resetStore({ controllerCount: 0, displayCount: 0 });
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("CTL: 0")).toBeInTheDocument();
      expect(screen.getByText("DSP: 0")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 複製房間碼
  // --------------------------------------------------------------------------

  describe("copy session code", () => {
    it("copies session code to clipboard when room button is clicked", async () => {
      render(<StatusBar {...defaultProps} />);
      const copyButton = screen.getByTitle("點擊複製房間碼");

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("AB1234");
    });
  });

  // --------------------------------------------------------------------------
  // 複製顯示端連結
  // --------------------------------------------------------------------------

  describe("copy display link", () => {
    it("copies display URL to clipboard when link button is clicked", async () => {
      render(<StatusBar {...defaultProps} />);
      const copyLinkButton = screen.getByTitle("複製顯示端連結");

      await act(async () => {
        fireEvent.click(copyLinkButton);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/display?code=AB1234`,
      );
    });

    it("shows '已複製' text after copying link", async () => {
      render(<StatusBar {...defaultProps} />);
      const copyLinkButton = screen.getByTitle("複製顯示端連結");

      await act(async () => {
        fireEvent.click(copyLinkButton);
      });

      expect(screen.getByText("已複製")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 重新產生房間碼
  // --------------------------------------------------------------------------

  describe("regenerate session code", () => {
    it("calls onRegenerate when regenerate button is clicked", () => {
      const onRegenerate = vi.fn();
      render(<StatusBar sessionCode="AB1234" onRegenerate={onRegenerate} />);
      const regenButton = screen.getByText("新房間").closest("button")!;

      fireEvent.click(regenButton);

      expect(onRegenerate).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // QR Code 按鈕
  // --------------------------------------------------------------------------

  describe("QR code button", () => {
    it("renders QR button", () => {
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("QR")).toBeInTheDocument();
    });

    it("shows QRCodePanel when QR button is clicked", () => {
      render(<StatusBar {...defaultProps} />);
      const qrButton = screen.getByText("QR").closest("button")!;

      fireEvent.click(qrButton);

      expect(screen.getAllByTestId("qrcode-panel").length).toBeGreaterThan(0);
    });

    it("hides QRCodePanel when QR button is clicked again", () => {
      render(<StatusBar {...defaultProps} />);
      const qrButton = screen.getByText("QR").closest("button")!;

      // 打開
      fireEvent.click(qrButton);
      expect(screen.getAllByTestId("qrcode-panel").length).toBeGreaterThan(0);

      // 關閉（toggle）
      fireEvent.click(qrButton);
      expect(screen.queryByTestId("qrcode-panel")).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 目前歌曲顯示
  // --------------------------------------------------------------------------

  describe("current song display", () => {
    it("does not show song info when no song is selected", () => {
      resetStore({ currentSong: null });
      render(<StatusBar {...defaultProps} />);
      // 沒有包含 " — " 的 span
      expect(screen.queryByText(/—/)).toBeNull();
    });

    it("shows song title when a song is selected", () => {
      resetStore({ currentSong: { title: "奇異恩典", artist: "" } });
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("奇異恩典")).toBeInTheDocument();
    });

    it("shows song title and artist when both are present", () => {
      resetStore({
        currentSong: { title: "奇異恩典", artist: "John Newton" },
      });
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("奇異恩典 — John Newton")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 設計系統合規
  // --------------------------------------------------------------------------

  describe("design system compliance", () => {
    it("does not contain hardcoded rgba values in inline styles", () => {
      const { container } = render(<StatusBar {...defaultProps} />);
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

// ============================================================================
// MobileStatusBar 測試
// ============================================================================

describe("MobileStatusBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("basic rendering", () => {
    it("renders the session code", () => {
      render(<MobileStatusBar sessionCode="XY9999" isConnected />);
      expect(screen.getByText("XY9999")).toBeInTheDocument();
    });

    it("renders Room label", () => {
      render(<MobileStatusBar sessionCode="XY9999" isConnected />);
      expect(screen.getByText("Room")).toBeInTheDocument();
    });

    it("renders inside a header element", () => {
      render(<MobileStatusBar sessionCode="XY9999" isConnected />);
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 連線狀態
  // --------------------------------------------------------------------------

  describe("connection status", () => {
    it("shows ON when connected", () => {
      render(<MobileStatusBar sessionCode="XY9999" isConnected />);
      expect(screen.getByText("ON")).toBeInTheDocument();
    });

    it("shows OFF when disconnected", () => {
      render(<MobileStatusBar sessionCode="XY9999" isConnected={false} />);
      expect(screen.getByText("OFF")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 複製房間碼
  // --------------------------------------------------------------------------

  describe("copy session code", () => {
    it("copies session code when room button is clicked", async () => {
      render(<MobileStatusBar sessionCode="XY9999" isConnected />);
      const copyButton = screen.getByTitle("點擊複製房間碼");

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("XY9999");
    });
  });
});

// ============================================================================
// MobileQRTab 測試
// ============================================================================

describe("MobileQRTab", () => {
  const defaultProps = {
    sessionCode: "QR1234",
    onRegenerate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("basic rendering", () => {
    it("renders QRCodePanel with correct session code", () => {
      render(<MobileQRTab {...defaultProps} />);
      const panel = screen.getByTestId("qrcode-panel");
      expect(panel.getAttribute("data-session-code")).toBe("QR1234");
    });

    it("renders QRCodePanel with size 200", () => {
      render(<MobileQRTab {...defaultProps} />);
      const panel = screen.getByTestId("qrcode-panel");
      expect(panel.getAttribute("data-size")).toBe("200");
    });

    it("renders copy link button", () => {
      render(<MobileQRTab {...defaultProps} />);
      expect(screen.getByText("複製顯示端連結")).toBeInTheDocument();
    });

    it("renders regenerate button", () => {
      render(<MobileQRTab {...defaultProps} />);
      expect(screen.getByText("新房間")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 複製顯示端連結
  // --------------------------------------------------------------------------

  describe("copy display link", () => {
    it("copies display URL when copy link button is clicked", async () => {
      render(<MobileQRTab {...defaultProps} />);
      const copyButton = screen.getByText("複製顯示端連結").closest("button")!;

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/display?code=QR1234`,
      );
    });

    it("shows '已複製連結' text after copying", async () => {
      render(<MobileQRTab {...defaultProps} />);
      const copyButton = screen.getByText("複製顯示端連結").closest("button")!;

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByText("已複製連結")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 重新產生房間碼
  // --------------------------------------------------------------------------

  describe("regenerate session code", () => {
    it("calls onRegenerate when regenerate button is clicked", () => {
      const onRegenerate = vi.fn();
      render(<MobileQRTab sessionCode="QR1234" onRegenerate={onRegenerate} />);
      const regenButton = screen.getByText("新房間").closest("button")!;

      fireEvent.click(regenButton);

      expect(onRegenerate).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // 設計系統合規
  // --------------------------------------------------------------------------

  describe("design system compliance", () => {
    it("does not contain hardcoded rgba values in inline styles", () => {
      const { container } = render(<MobileQRTab {...defaultProps} />);
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
