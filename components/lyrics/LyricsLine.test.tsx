/**
 * LyricsLine 元件測試
 *
 * 覆蓋範圍：
 * 1. 渲染歌詞文字內容
 * 2. 空字串時顯示 non-breaking space
 * 3. 啟用狀態（isActive=true）的樣式行為
 * 4. 非啟用狀態（isActive=false）的樣式行為
 * 5. fontSize prop 正確套用
 * 6. enableAnimation=false 加上 transition-none class
 * 7. data-index 與 data-active 屬性正確設定
 * 8. 超長歌詞溢出處理樣式
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LyricsLine, type LyricsLineProps } from "./LyricsLine";

// 預設 props 輔助工具
const defaultProps: LyricsLineProps = {
  text: "Amazing Grace",
  isActive: false,
  fontSize: 32,
  textColor: "#ffffff",
  highlightColor: "#ff6600",
  enableAnimation: true,
  index: 0,
};

/**
 * 輔助函式：渲染元件並取得 DOM 元素
 */
function renderLine(overrides: Partial<LyricsLineProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  const { container } = render(<LyricsLine {...props} />);
  // 元件渲染的是單一 div
  const element = container.firstElementChild as HTMLElement;
  return { element, props };
}

describe("LyricsLine 元件", () => {
  // ====================================================================
  // 文字渲染
  // ====================================================================

  describe("文字渲染", () => {
    it("應正確渲染歌詞文字內容", () => {
      const { element } = renderLine({ text: "奇異恩典" });
      expect(element.textContent).toBe("奇異恩典");
    });

    it("文字為空字串時應顯示 non-breaking space（\\u00A0）", () => {
      const { element } = renderLine({ text: "" });
      expect(element.textContent).toBe("\u00A0");
    });
  });

  // ====================================================================
  // 啟用狀態（isActive=true）
  // ====================================================================

  describe("啟用狀態（isActive=true）", () => {
    it("應套用 scale-105 class", () => {
      const { element } = renderLine({ isActive: true });
      expect(element.className).toContain("scale-105");
    });

    it("應套用 font-bold class", () => {
      const { element } = renderLine({ isActive: true });
      expect(element.className).toContain("font-bold");
    });

    it("應使用 highlightColor 作為文字顏色", () => {
      const { element } = renderLine({
        isActive: true,
        highlightColor: "#ff6600",
      });
      // jsdom 會將 hex 色碼轉為 rgb 格式
      expect(element.style.color).toBe("rgb(255, 102, 0)");
    });

    it("應套用 textShadow 霓虹光暈效果", () => {
      const { element } = renderLine({
        isActive: true,
        highlightColor: "#ff6600",
      });
      expect(element.style.textShadow).toBe(
        "0 0 20px #ff660040, 0 0 40px #ff660030"
      );
    });

    it("不應套用 opacity-40 class", () => {
      const { element } = renderLine({ isActive: true });
      expect(element.className).not.toContain("opacity-40");
    });

    it("應套用 scale(1.05) 的 inline transform", () => {
      const { element } = renderLine({ isActive: true });
      expect(element.style.transform).toBe("scale(1.05)");
    });
  });

  // ====================================================================
  // 非啟用狀態（isActive=false）
  // ====================================================================

  describe("非啟用狀態（isActive=false）", () => {
    it("應套用 opacity-40 class", () => {
      const { element } = renderLine({ isActive: false });
      expect(element.className).toContain("opacity-40");
    });

    it("應使用 textColor 作為文字顏色", () => {
      const { element } = renderLine({
        isActive: false,
        textColor: "#cccccc",
      });
      // jsdom 會將 hex 色碼轉為 rgb 格式
      expect(element.style.color).toBe("rgb(204, 204, 204)");
    });

    it("textShadow 應為 none", () => {
      const { element } = renderLine({ isActive: false });
      expect(element.style.textShadow).toBe("none");
    });

    it("不應套用 scale-105 class", () => {
      const { element } = renderLine({ isActive: false });
      expect(element.className).not.toContain("scale-105");
    });

    it("不應套用 font-bold class", () => {
      const { element } = renderLine({ isActive: false });
      expect(element.className).not.toContain("font-bold");
    });

    it("應套用 scale(1) 的 inline transform", () => {
      const { element } = renderLine({ isActive: false });
      expect(element.style.transform).toBe("scale(1)");
    });
  });

  // ====================================================================
  // fontSize 屬性
  // ====================================================================

  describe("fontSize 屬性", () => {
    it("應將 fontSize 以 px 單位套用至 style", () => {
      const { element } = renderLine({ fontSize: 48 });
      expect(element.style.fontSize).toBe("48px");
    });

    it("應正確處理不同的 fontSize 值", () => {
      const { element } = renderLine({ fontSize: 16 });
      expect(element.style.fontSize).toBe("16px");
    });
  });

  // ====================================================================
  // 動畫控制
  // ====================================================================

  describe("動畫控制（enableAnimation）", () => {
    it("enableAnimation=false 時應加上 transition-none class", () => {
      const { element } = renderLine({ enableAnimation: false });
      expect(element.className).toContain("transition-none");
    });

    it("enableAnimation=true 時不應包含 transition-none class", () => {
      const { element } = renderLine({ enableAnimation: true });
      expect(element.className).not.toContain("transition-none");
    });

    it("enableAnimation=true 時應包含 transition-all class", () => {
      const { element } = renderLine({ enableAnimation: true });
      expect(element.className).toContain("transition-all");
    });
  });

  // ====================================================================
  // data 屬性
  // ====================================================================

  describe("data 屬性", () => {
    it("應正確設定 data-index 屬性", () => {
      const { element } = renderLine({ index: 5 });
      expect(element.getAttribute("data-index")).toBe("5");
    });

    it("isActive=true 時 data-active 應為 true", () => {
      const { element } = renderLine({ isActive: true });
      expect(element.getAttribute("data-active")).toBe("true");
    });

    it("isActive=false 時 data-active 應為 false", () => {
      const { element } = renderLine({ isActive: false });
      expect(element.getAttribute("data-active")).toBe("false");
    });
  });

  // ====================================================================
  // 超長歌詞溢出處理
  // ====================================================================

  describe("超長歌詞溢出處理", () => {
    it("應設定 overflowWrap: break-word 避免溢出", () => {
      const { element } = renderLine();
      expect(element.style.overflowWrap).toBe("break-word");
    });

    it("應設定 wordBreak: break-word 處理無空格長字串", () => {
      const { element } = renderLine();
      expect(element.style.wordBreak).toBe("break-word");
    });

    it("應設定 maxWidth: 100% 限制寬度", () => {
      const { element } = renderLine();
      expect(element.style.maxWidth).toBe("100%");
    });
  });

  // ====================================================================
  // CSS class 基礎
  // ====================================================================

  describe("基礎 CSS class", () => {
    it("應包含 lyrics-line class", () => {
      const { element } = renderLine();
      expect(element.className).toContain("lyrics-line");
    });

    it("應包含 text-center class", () => {
      const { element } = renderLine();
      expect(element.className).toContain("text-center");
    });
  });
});
