/**
 * next-intl 請求層設定
 *
 * 為每個伺服器端請求提供 locale 與對應的翻譯訊息。
 * 目前使用預設 locale（zh-TW），後續可從 cookie/header 動態取得。
 */

import { getRequestConfig } from "next-intl/server";
import { defaultLocale, type Locale } from "@/lib/i18n/config";

export default getRequestConfig(async () => {
  // 目前固定使用預設 locale
  // 後續迭代可改為從 cookie（使用者語言偏好）或 Accept-Language header 取得
  const locale: Locale = defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
