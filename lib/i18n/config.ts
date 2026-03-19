/**
 * i18n 設定 — 支援的語言與預設語言
 *
 * 此模組定義 next-intl 所需的基礎設定常數與型別。
 * 語言代碼遵循 BCP 47（IETF language tag）規範。
 */

/** 支援的語言代碼 */
export const locales = ["zh-TW", "zh-CN", "en"] as const;

/** Locale 型別 */
export type Locale = (typeof locales)[number];

/** 預設語言 */
export const defaultLocale: Locale = "zh-TW";

/**
 * 繁體中文區域代碼（使用傳統中文字的地區）
 * 用於將 Accept-Language 中的 zh 子標籤 fallback 至 zh-TW
 */
const traditionalChineseRegions = new Set(["TW", "HK", "MO"]);

/**
 * 從 Accept-Language header 值偵測最佳匹配的 locale
 *
 * 匹配優先順序：
 * 1. 精確匹配 locales 中的值（如 zh-TW、zh-CN、en）
 * 2. zh 子標籤 fallback：zh-HK/zh-MO → zh-TW，zh-SG 等 → zh-CN
 * 3. en 前綴 fallback：en-US/en-GB → en
 * 4. 純 zh → zh-TW
 * 5. 都不匹配 → defaultLocale
 */
export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  // 解析 Accept-Language header，例如 "zh-TW,zh;q=0.9,en;q=0.8"
  const candidates = acceptLanguage
    .split(",")
    .map((segment) => segment.split(";")[0]!.trim())
    .filter((lang) => lang.length > 0);

  for (const candidate of candidates) {
    // 精確匹配
    if (locales.includes(candidate as Locale)) {
      return candidate as Locale;
    }

    // zh 子標籤 fallback
    if (candidate.startsWith("zh-")) {
      const region = candidate.slice(3).toUpperCase();
      return traditionalChineseRegions.has(region) ? "zh-TW" : "zh-CN";
    }

    // en 前綴 fallback（en-US, en-GB 等）
    if (candidate.startsWith("en-") || candidate === "en") {
      return "en";
    }

    // 純 zh（無地區碼）
    if (candidate === "zh") {
      return "zh-TW";
    }
  }

  return defaultLocale;
}
