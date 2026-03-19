/**
 * LocaleSwitcher — 語言切換按鈕群組
 *
 * 顯示支援的語言選項，點擊後將偏好寫入 cookie 並重新載入頁面，
 * 讓 i18n/request.ts 從 cookie 讀取使用者選擇的語言。
 */

"use client";

import { useLocale } from "next-intl";
import { locales } from "@/lib/i18n/config";

/** 各 locale 的顯示標籤 */
const LOCALE_LABELS: Record<string, string> = {
  "zh-TW": "繁中",
  "zh-CN": "简中",
  en: "EN",
};

export function LocaleSwitcher() {
  const currentLocale = useLocale();

  function switchLocale(locale: string) {
    document.cookie = `locale=${locale};path=/;max-age=31536000`;
    window.location.reload();
  }

  return (
    <div className="flex gap-1">
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => switchLocale(locale)}
          className={[
            "px-2 py-1 text-[10px] font-mono uppercase border transition-colors",
            locale === currentLocale
              ? "bg-accent/20 border-accent/40 text-accent"
              : "bg-surface border-border-dim text-text-muted hover:bg-elevated",
          ].join(" ")}
        >
          {LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
