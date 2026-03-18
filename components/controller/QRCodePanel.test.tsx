/**
 * QRCodePanel 元件測試
 *
 * 測試內容：
 * 1. 基本渲染：標題、房間碼、說明文字
 * 2. QR Code 產生：傳遞正確 URL 給 QRCodeSVG
 * 3. 空 sessionCode 不渲染
 * 4. 下載按鈕存在
 * 5. 自訂 size 和 className
 * 6. 設計系統合規
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

// Mock qrcode.react：用 div 取代 QRCodeSVG 和 QRCodeCanvas，暴露 props 供驗證
vi.mock("qrcode.react", () => ({
  QRCodeSVG: (props: Record<string, unknown>) => (
    <div data-testid="qrcode-svg" data-value={props["value"] as string} data-size={props["size"] as number} />
  ),
  QRCodeCanvas: (props: Record<string, unknown>) => (
    <canvas data-testid="qrcode-canvas" data-value={props["value"] as string} data-size={props["size"] as number} />
  ),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Download: (props: Record<string, unknown>) => (
    <span data-testid="icon-download" {...props} />
  ),
}));

import { QRCodePanel } from "./QRCodePanel";

// ============================================================================
// 測試
// ============================================================================

describe("QRCodePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("basic rendering", () => {
    it("renders the scan title text", () => {
      render(<QRCodePanel sessionCode="ABC123" />);
      expect(screen.getByText("掃碼連接")).toBeInTheDocument();
    });

    it("renders the session code", () => {
      render(<QRCodePanel sessionCode="ABC123" />);
      expect(screen.getByText("ABC123")).toBeInTheDocument();
    });

    it("renders the description text", () => {
      render(<QRCodePanel sessionCode="ABC123" />);
      expect(screen.getByText("掃描後自動連接顯示端")).toBeInTheDocument();
    });

    it("renders download button with text", () => {
      render(<QRCodePanel sessionCode="ABC123" />);
      expect(screen.getByText("下載 QR")).toBeInTheDocument();
    });

    it("renders download icon", () => {
      render(<QRCodePanel sessionCode="ABC123" />);
      expect(screen.getByTestId("icon-download")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // QR Code 產生
  // --------------------------------------------------------------------------

  describe("QR code generation", () => {
    it("renders QRCodeSVG component", () => {
      render(<QRCodePanel sessionCode="TEST99" />);
      expect(screen.getByTestId("qrcode-svg")).toBeInTheDocument();
    });

    it("passes correct display URL to QRCodeSVG", () => {
      render(<QRCodePanel sessionCode="TEST99" />);
      const qrSvg = screen.getByTestId("qrcode-svg");
      expect(qrSvg.getAttribute("data-value")).toBe(
        `${window.location.origin}/display?code=TEST99`,
      );
    });

    it("uses default size of 160 for QRCodeSVG", () => {
      render(<QRCodePanel sessionCode="TEST99" />);
      const qrSvg = screen.getByTestId("qrcode-svg");
      expect(qrSvg.getAttribute("data-size")).toBe("160");
    });

    it("uses custom size when provided", () => {
      render(<QRCodePanel sessionCode="TEST99" size={200} />);
      const qrSvg = screen.getByTestId("qrcode-svg");
      expect(qrSvg.getAttribute("data-size")).toBe("200");
    });

    it("renders QRCodeCanvas for download at 512px", () => {
      render(<QRCodePanel sessionCode="TEST99" />);
      const qrCanvas = screen.getByTestId("qrcode-canvas");
      expect(qrCanvas.getAttribute("data-size")).toBe("512");
    });
  });

  // --------------------------------------------------------------------------
  // 空 sessionCode
  // --------------------------------------------------------------------------

  describe("empty session code", () => {
    it("returns null when sessionCode is empty", () => {
      const { container } = render(<QRCodePanel sessionCode="" />);
      expect(container.firstChild).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 自訂 className
  // --------------------------------------------------------------------------

  describe("custom className", () => {
    it("applies custom className to root element", () => {
      const { container } = render(
        <QRCodePanel sessionCode="ABC123" className="custom-class" />,
      );
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain("custom-class");
    });
  });

  // --------------------------------------------------------------------------
  // 下載功能
  // --------------------------------------------------------------------------

  describe("download functionality", () => {
    it("download button is clickable", () => {
      render(<QRCodePanel sessionCode="ABC123" />);
      const button = screen.getByText("下載 QR").closest("button");
      expect(button).toBeTruthy();
      // 點擊不應拋出錯誤（canvas 不存在時 handleDownload 會 early return）
      expect(() => fireEvent.click(button!)).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // 設計系統合規
  // --------------------------------------------------------------------------

  describe("design system compliance", () => {
    it("does not contain hardcoded rgba values in inline styles", () => {
      const { container } = render(
        <QRCodePanel sessionCode="ABC123" />,
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
  });
});
