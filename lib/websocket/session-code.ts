/**
 * 房間碼（Session Code）生成工具
 *
 * 產生 6 碼大寫英數字房間碼，用於 Controller 與 Display 之間的配對。
 * 排除容易混淆的字元：0/O、1/I/L，確保在投影幕上辨識度高。
 */

// 排除 0, O, 1, I, L 的字元集（26 字母 + 10 數字 - 5 混淆字元 = 31 字元）
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const CODE_LENGTH = 6;

/**
 * 產生隨機房間碼
 *
 * 使用 crypto.getRandomValues() 確保密碼學等級的隨機性。
 * 若環境不支援（SSR），退回 Math.random()。
 */
export function generateSessionCode(): string {
  const chars: string[] = [];

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint8Array(CODE_LENGTH);
    crypto.getRandomValues(values);
    for (let i = 0; i < CODE_LENGTH; i++) {
      chars.push(CHARSET[values[i]! % CHARSET.length]!);
    }
  } else {
    for (let i = 0; i < CODE_LENGTH; i++) {
      chars.push(CHARSET[Math.floor(Math.random() * CHARSET.length)]!);
    }
  }

  return chars.join("");
}
