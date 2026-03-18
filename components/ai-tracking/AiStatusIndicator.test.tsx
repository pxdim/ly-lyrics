/**
 * AiStatusIndicator 元件測試
 *
 * 覆蓋範圍：
 * 1. 五種狀態渲染（idle, listening, matched, cooldown, error）
 * 2. cooldown 狀態倒數計時顯示
 * 3. matched 狀態信心度與行號顯示
 * 4. 設計系統語意色（不使用硬編碼色彩）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AiStatusIndicator } from "./AiStatusIndicator";

describe("AiStatusIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // 五種狀態基本渲染
  // --------------------------------------------------------------------------

  describe("status rendering", () => {
    it("renders idle status with '待機' label", () => {
      render(
        <AiStatusIndicator
          status="idle"
          confidence={0}
          lastMatchedLine={null}
          cooldownUntil={null}
        />,
      );

      expect(screen.getByText("待機")).toBeInTheDocument();
    });

    it("renders listening status with '監聽中' label", () => {
      render(
        <AiStatusIndicator
          status="listening"
          confidence={0}
          lastMatchedLine={null}
          cooldownUntil={null}
        />,
      );

      expect(screen.getByText("監聽中")).toBeInTheDocument();
    });

    it("renders matched status with '已匹配' label", () => {
      render(
        <AiStatusIndicator
          status="matched"
          confidence={0.85}
          lastMatchedLine={3}
          cooldownUntil={null}
        />,
      );

      expect(screen.getByText("已匹配")).toBeInTheDocument();
    });

    it("renders cooldown status with '冷卻中' label", () => {
      const cooldownUntil = Date.now() + 5000;
      render(
        <AiStatusIndicator
          status="cooldown"
          confidence={0}
          lastMatchedLine={null}
          cooldownUntil={cooldownUntil}
        />,
      );

      expect(screen.getByText(/冷卻中/)).toBeInTheDocument();
    });

    it("renders error status with '錯誤' label", () => {
      render(
        <AiStatusIndicator
          status="error"
          confidence={0}
          lastMatchedLine={null}
          cooldownUntil={null}
        />,
      );

      expect(screen.getByText("錯誤")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Cooldown 倒數計時
  // --------------------------------------------------------------------------

  describe("cooldown countdown", () => {
    it("displays remaining seconds during cooldown", () => {
      const cooldownUntil = Date.now() + 5000;
      render(
        <AiStatusIndicator
          status="cooldown"
          confidence={0}
          lastMatchedLine={null}
          cooldownUntil={cooldownUntil}
        />,
      );

      expect(screen.getByText("5s")).toBeInTheDocument();
    });

    it("updates countdown as time passes", () => {
      const cooldownUntil = Date.now() + 5000;
      render(
        <AiStatusIndicator
          status="cooldown"
          confidence={0}
          lastMatchedLine={null}
          cooldownUntil={cooldownUntil}
        />,
      );

      expect(screen.getByText("5s")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText("4s")).toBeInTheDocument();
    });

    it("does not display countdown seconds for non-cooldown status", () => {
      render(
        <AiStatusIndicator
          status="listening"
          confidence={0}
          lastMatchedLine={null}
          cooldownUntil={null}
        />,
      );

      // 不應該有 "s" 倒數文字
      expect(screen.queryByText(/\ds$/)).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Matched 狀態：信心度 + 行號
  // --------------------------------------------------------------------------

  describe("matched status details", () => {
    it("displays confidence percentage in matched status", () => {
      render(
        <AiStatusIndicator
          status="matched"
          confidence={0.85}
          lastMatchedLine={3}
          cooldownUntil={null}
        />,
      );

      expect(screen.getByText("85%")).toBeInTheDocument();
    });

    it("displays matched line number (1-based, zero-padded)", () => {
      render(
        <AiStatusIndicator
          status="matched"
          confidence={0.75}
          lastMatchedLine={3}
          cooldownUntil={null}
        />,
      );

      // lastMatchedLine 為 0-based index，顯示為 1-based
      expect(screen.getByText("04")).toBeInTheDocument();
      expect(screen.getByText("Line")).toBeInTheDocument();
    });

    it("does not display line info when lastMatchedLine is null", () => {
      render(
        <AiStatusIndicator
          status="matched"
          confidence={0.75}
          lastMatchedLine={null}
          cooldownUntil={null}
        />,
      );

      expect(screen.queryByText("Line")).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 設計系統語意色驗證
  // --------------------------------------------------------------------------

  describe("design system semantic colors", () => {
    it("uses success semantic color classes for matched status (not hardcoded emerald)", () => {
      const { container } = render(
        <AiStatusIndicator
          status="matched"
          confidence={0.85}
          lastMatchedLine={3}
          cooldownUntil={null}
        />,
      );

      const html = container.innerHTML;

      // 不應包含硬編碼的 emerald 色
      expect(html).not.toContain("emerald");

      // 應使用 success 語意色
      expect(html).toContain("success");
    });

    it("uses warning semantic color classes for cooldown status (not hardcoded amber)", () => {
      const cooldownUntil = Date.now() + 5000;
      const { container } = render(
        <AiStatusIndicator
          status="cooldown"
          confidence={0}
          lastMatchedLine={null}
          cooldownUntil={cooldownUntil}
        />,
      );

      const html = container.innerHTML;

      // 不應包含硬編碼的 amber 色
      expect(html).not.toContain("amber");

      // 應使用 warning 語意色
      expect(html).toContain("warning");
    });

    it("uses error semantic color classes for error status (not hardcoded red)", () => {
      const { container } = render(
        <AiStatusIndicator
          status="error"
          confidence={0}
          lastMatchedLine={null}
          cooldownUntil={null}
        />,
      );

      const html = container.innerHTML;

      // 不應包含硬編碼的 red 色
      expect(html).not.toContain("red-");

      // 應使用 error 語意色
      expect(html).toContain("error");
    });
  });
});
