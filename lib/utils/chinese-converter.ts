import * as OpenCC from "opencc-js";

// 建立簡體→繁體轉換器（模組級別單例）
const s2tConverter = OpenCC.Converter({ from: "cn", to: "tw" });

/**
 * 將簡體中文轉換為繁體中文
 */
export function convertToTraditional(text: string): string {
  if (!text) return text;
  return s2tConverter(text);
}
