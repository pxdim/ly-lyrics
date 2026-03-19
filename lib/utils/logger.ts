/**
 * Logger 工具
 *
 * 環境感知的日誌輸出工具：
 * - debug/info：僅在 development 環境輸出（避免生產環境 console 噪音）
 * - warn/error：在所有環境都輸出（生產問題需要被追蹤）
 */

const isDev = process.env.NODE_ENV === "development";

export const logger = {
  /** 除錯訊息 — 僅 development 環境輸出 */
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  /** 資訊訊息 — 僅 development 環境輸出 */
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  /** 警告訊息 — 所有環境輸出 */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  /** 錯誤訊息 — 所有環境輸出 */
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
