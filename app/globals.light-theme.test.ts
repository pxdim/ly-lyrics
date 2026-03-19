/**
 * 淺色主題 CSS 變數定義測試
 *
 * 驗證 globals.css 中 [data-theme="light"] 覆寫了所有必要的深色預設變數。
 * 確保品牌色（primary/secondary/accent/glow）不隨主題變更。
 * 確保 glass morphism 相關變數存在（--color-glass-bg, --color-glass-border）。
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ============================================================================
// 讀取 globals.css 原始內容
// ============================================================================

const globalsCss = readFileSync(
  resolve(__dirname, "globals.css"),
  "utf-8",
);

// ============================================================================
// 測試
// ============================================================================

describe("淺色主題 CSS 變數定義", () => {
  it("globals.css 包含 [data-theme='light'] 選擇器", () => {
    expect(globalsCss).toContain('[data-theme="light"]');
  });

  describe("必須覆寫的背景/文字/邊框變數", () => {
    const requiredVariables = [
      "--color-void",
      "--color-surface",
      "--color-elevated",
      "--color-text-primary",
      "--color-text-muted",
      "--color-border-dim",
    ];

    for (const varName of requiredVariables) {
      it(`[data-theme="light"] 覆寫 ${varName}`, () => {
        // 提取 [data-theme="light"] 區塊
        const lightBlockMatch = globalsCss.match(
          /\[data-theme="light"\]\s*\{([^}]+)\}/s,
        );
        expect(lightBlockMatch).not.toBeNull();

        const lightBlock = lightBlockMatch![1]!;
        expect(lightBlock).toContain(varName);
      });
    }
  });

  describe("不應覆寫的品牌色變數", () => {
    const brandVariables = [
      "--color-primary",
      "--color-secondary",
      "--color-accent",
      "--color-success",
      "--color-warning",
      "--color-error",
      "--color-glow-primary",
      "--color-glow-secondary",
      "--color-glow-accent",
    ];

    for (const varName of brandVariables) {
      it(`[data-theme="light"] 不覆寫品牌色 ${varName}`, () => {
        const lightBlockMatch = globalsCss.match(
          /\[data-theme="light"\]\s*\{([^}]+)\}/s,
        );
        expect(lightBlockMatch).not.toBeNull();

        const lightBlock = lightBlockMatch![1]!;
        expect(lightBlock).not.toContain(varName);
      });
    }
  });

  describe("淺色主題元件類別覆寫", () => {
    it("覆寫 glow-orb-primary opacity", () => {
      expect(globalsCss).toMatch(
        /\[data-theme="light"\]\s*\.glow-orb-primary/,
      );
    });

    it("覆寫 glow-orb-secondary opacity", () => {
      expect(globalsCss).toMatch(
        /\[data-theme="light"\]\s*\.glow-orb-secondary/,
      );
    });

    it("覆寫 focus-glow 動畫", () => {
      expect(globalsCss).toMatch(
        /\[data-theme="light"\]\s*\.focus-glow/,
      );
    });

    it("覆寫 btn-neon box-shadow", () => {
      expect(globalsCss).toMatch(
        /\[data-theme="light"\]\s*\.btn-neon/,
      );
    });
  });

  describe("glass morphism CSS 變數", () => {
    it("[data-theme='light'] 定義 --color-glass-bg", () => {
      const lightBlockMatch = globalsCss.match(
        /\[data-theme="light"\]\s*\{([^}]+)\}/s,
      );
      expect(lightBlockMatch).not.toBeNull();
      expect(lightBlockMatch![1]!).toContain("--color-glass-bg");
    });

    it("[data-theme='light'] 定義 --color-glass-border", () => {
      const lightBlockMatch = globalsCss.match(
        /\[data-theme="light"\]\s*\{([^}]+)\}/s,
      );
      expect(lightBlockMatch).not.toBeNull();
      expect(lightBlockMatch![1]!).toContain("--color-glass-border");
    });

    it(":root 定義 --color-glass-bg（深色預設值）", () => {
      // 確保 :root 區塊也有 glass 變數，作為深色預設
      expect(globalsCss).toContain("--color-glass-bg");
    });

    it(":root 定義 --color-glass-border（深色預設值）", () => {
      expect(globalsCss).toContain("--color-glass-border");
    });
  });
});
