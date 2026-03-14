import { describe, it, expect } from "vitest";
import { convertToTraditional } from "./chinese-converter";

describe("chinese-converter", () => {
  describe("convertToTraditional", () => {
    it("將簡體轉為繁體", () => {
      const result = convertToTraditional("告白气球");
      expect(result).toBe("告白氣球");
    });

    it("繁體文字不變", () => {
      const result = convertToTraditional("告白氣球");
      expect(result).toBe("告白氣球");
    });

    it("英文文字不變", () => {
      const result = convertToTraditional("Hello World");
      expect(result).toBe("Hello World");
    });

    it("空字串不變", () => {
      const result = convertToTraditional("");
      expect(result).toBe("");
    });

    it("混合中英文正確轉換", () => {
      const result = convertToTraditional("[00:00.00]塞纳河畔 左岸的咖啡");
      expect(result).toContain("塞納河畔");
    });
  });
});
