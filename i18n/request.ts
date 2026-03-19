/**
 * next-intl 請求層設定
 *
 * 為每個伺服器端請求提供 locale 與對應的翻譯訊息。
 * 語言偵測優先順序：
 * 1. Cookie（使用者手動選擇過的語言偏好）
 * 2. Accept-Language header（瀏覽器/系統語言）
 * 3. defaultLocale fallback（zh-TW）
 */

import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  locales,
  detectLocale,
  type Locale,
} from "@/lib/i18n/config";

export default getRequestConfig(async () => {
  // 1. Cookie 優先（使用者手動選擇過）
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value as Locale | undefined;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return {
      locale: cookieLocale,
      messages: (await import(`../messages/${cookieLocale}.json`)).default,
    };
  }

  // 2. Accept-Language header（系統語言自動偵測）
  const headerStore = await headers();
  const acceptLang = headerStore.get("accept-language");
  const detected = detectLocale(acceptLang);

  return {
    locale: detected,
    messages: (await import(`../messages/${detected}.json`)).default,
  };
});
