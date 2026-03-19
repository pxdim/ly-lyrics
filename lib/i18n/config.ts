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
