/**
 * Session Code 生成器單元測試
 *
 * 測試房間碼的格式、字元集、唯一性等特性。
 */

import { describe, it, expect } from "vitest";
import { generateSessionCode } from "./session-code";

// 排除混淆字元後的合法字元集
const VALID_CHARS = new Set("ABCDEFGHJKMNPQRSTUVWXYZ23456789".split(""));

describe("generateSessionCode", () => {
  it("產生 6 字元的房間碼", () => {
    const code = generateSessionCode();
    expect(code).toHaveLength(6);
  });

  it("只包含合法字元（排除 0/O/1/I/L）", () => {
    // 多次測試以提高覆蓋率
    for (let i = 0; i < 50; i++) {
      const code = generateSessionCode();
      for (const char of code) {
        expect(VALID_CHARS.has(char)).toBe(true);
      }
    }
  });

  it("不包含混淆字元 0, O, 1, I, L", () => {
    const excluded = ["0", "O", "1", "I", "L"];
    for (let i = 0; i < 50; i++) {
      const code = generateSessionCode();
      for (const char of excluded) {
        expect(code).not.toContain(char);
      }
    }
  });

  it("全部大寫", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateSessionCode();
      expect(code).toBe(code.toUpperCase());
    }
  });

  it("多次生成不重複（統計性驗證）", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateSessionCode());
    }
    // 31^6 ≈ 8.87 億種組合，100 次應幾乎不重複
    expect(codes.size).toBeGreaterThanOrEqual(95);
  });

  it("回傳型別為 string", () => {
    const code = generateSessionCode();
    expect(typeof code).toBe("string");
  });
});
