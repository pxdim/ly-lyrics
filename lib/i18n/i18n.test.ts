/**
 * i18n 多語言基礎架構測試
 *
 * 驗證所有語言檔案的 key 結構一致性、翻譯完整性、
 * 以及 next-intl 設定的正確性。
 */

import { describe, it, expect } from "vitest";

// 語言檔案
import zhTW from "@/messages/zh-TW.json";
import zhCN from "@/messages/zh-CN.json";
import en from "@/messages/en.json";

// 設定
import { locales, defaultLocale, type Locale } from "@/lib/i18n/config";

// ============================================================================
// 工具函式：遞迴取得所有 key 路徑（dot notation）
// ============================================================================

function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return getKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

// ============================================================================
// 測試
// ============================================================================

describe("i18n 語言檔案結構一致性", () => {
  const zhTWKeys = getKeys(zhTW);
  const zhCNKeys = getKeys(zhCN);
  const enKeys = getKeys(en);

  it("zh-TW 語言檔案應包含至少一個 key", () => {
    expect(zhTWKeys.length).toBeGreaterThan(0);
  });

  it("zh-CN 應包含與 zh-TW 完全相同的 key 結構", () => {
    expect(zhCNKeys).toEqual(zhTWKeys);
  });

  it("en 應包含與 zh-TW 完全相同的 key 結構", () => {
    expect(enKeys).toEqual(zhTWKeys);
  });
});

describe("i18n 翻譯值完整性", () => {
  const allLocales: Record<string, Record<string, unknown>> = {
    "zh-TW": zhTW,
    "zh-CN": zhCN,
    en,
  };

  function getValueByPath(
    obj: Record<string, unknown>,
    path: string,
  ): unknown {
    return path.split(".").reduce<unknown>((acc, key) => {
      if (typeof acc === "object" && acc !== null) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  it("所有語言檔案的所有翻譯值都應為非空字串", () => {
    const zhTWKeys = getKeys(zhTW);
    const errors: string[] = [];

    for (const [locale, messages] of Object.entries(allLocales)) {
      for (const key of zhTWKeys) {
        const value = getValueByPath(messages, key);
        if (typeof value !== "string" || value.trim() === "") {
          errors.push(`[${locale}] "${key}" 為空或非字串`);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  it("不同語言的翻譯值不應全部相同（除了品牌名稱等通用詞）", () => {
    // 至少應有一些 key 的 en 翻譯與 zh-TW 不同
    const zhTWKeys = getKeys(zhTW);
    let differentCount = 0;

    for (const key of zhTWKeys) {
      const twValue = getValueByPath(zhTW, key);
      const enValue = getValueByPath(en, key);
      if (twValue !== enValue) {
        differentCount++;
      }
    }

    // 應有超過一半的 key 英文翻譯與繁中不同
    expect(differentCount).toBeGreaterThan(zhTWKeys.length / 2);
  });
});

describe("i18n 設定", () => {
  it("應定義支援的 locale 清單", () => {
    expect(locales).toBeDefined();
    expect(Array.isArray(locales)).toBe(true);
    expect(locales.length).toBeGreaterThanOrEqual(3);
  });

  it("locales 應包含 zh-TW、zh-CN、en", () => {
    expect(locales).toContain("zh-TW");
    expect(locales).toContain("zh-CN");
    expect(locales).toContain("en");
  });

  it("預設 locale 應為 zh-TW", () => {
    expect(defaultLocale).toBe("zh-TW");
  });

  it("Locale 型別應能賦值為合法的 locale 字串", () => {
    // TypeScript 編譯時期驗證，此處只做 runtime 型別守衛
    const testLocale: Locale = "zh-TW";
    expect(locales).toContain(testLocale);
  });
});

describe("i18n 語言檔案涵蓋範圍", () => {
  it("應包含 controller 區塊的翻譯", () => {
    const keys = getKeys(zhTW);
    expect(keys.some((k) => k.startsWith("controller."))).toBe(true);
  });

  it("應包含 display 區塊的翻譯", () => {
    const keys = getKeys(zhTW);
    expect(keys.some((k) => k.startsWith("display."))).toBe(true);
  });

  it("應包含 auth 區塊的翻譯", () => {
    const keys = getKeys(zhTW);
    expect(keys.some((k) => k.startsWith("auth."))).toBe(true);
  });

  it("應包含 common 區塊的翻譯", () => {
    const keys = getKeys(zhTW);
    expect(keys.some((k) => k.startsWith("common."))).toBe(true);
  });

  it("應包含 ai 區塊的翻譯", () => {
    const keys = getKeys(zhTW);
    expect(keys.some((k) => k.startsWith("ai."))).toBe(true);
  });

  it("應包含 lyricsSearch 區塊的翻譯", () => {
    const keys = getKeys(zhTW);
    expect(keys.some((k) => k.startsWith("lyricsSearch."))).toBe(true);
  });
});
