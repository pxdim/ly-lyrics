/**
 * next-intl 測試 mock 工具
 *
 * 提供基於真實 zh-TW.json 翻譯的 mock 函式，
 * 讓元件測試可以驗證翻譯後的文字內容。
 */

import zhTW from "@/messages/zh-TW.json";

type Messages = Record<string, unknown>;

/**
 * 從巢狀物件中根據 dot-notation 路徑取值
 */
function getNestedValue(obj: Messages, path: string): string {
  const result = path.split(".").reduce<unknown>((acc, key) => {
    if (typeof acc === "object" && acc !== null) {
      return (acc as Messages)[key];
    }
    return undefined;
  }, obj);
  return typeof result === "string" ? result : path;
}

/**
 * 建立 next-intl 的 vi.mock 設定
 *
 * 使用方式：在測試檔案頂部呼叫 vi.mock("next-intl", () => createNextIntlMock())
 */
export function createNextIntlMock() {
  return {
    useTranslations: (namespace?: string) => {
      const t = (key: string, params?: Record<string, string | number>) => {
        const fullKey = namespace ? `${namespace}.${key}` : key;
        let value = getNestedValue(zhTW as Messages, fullKey);
        // 處理簡單的參數替換 {paramName}
        if (params) {
          for (const [paramKey, paramValue] of Object.entries(params)) {
            value = value.replace(`{${paramKey}}`, String(paramValue));
          }
        }
        return value;
      };
      // next-intl 的 t 函式也支援 t.rich() 等方法，簡化 mock 不實作
      return t;
    },
    useLocale: () => "zh-TW",
  };
}
