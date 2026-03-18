/**
 * 背景圖片上傳工具函式
 *
 * 提供圖片檔案驗證（格式、大小）與 data URL 轉換功能。
 * 用於 FR4.3 背景圖片上傳功能。
 */

/** 檔案大小上限：2MB */
const MAX_SIZE = 2 * 1024 * 1024;

/** 允許的圖片 MIME 類型 */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** 驗證結果型別 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 驗證圖片檔案是否符合上傳條件
 *
 * @param file - 使用者選擇的檔案
 * @returns 驗證結果，包含是否有效及錯誤訊息
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (file.size === 0) {
    return { valid: false, error: "檔案不可為空" };
  }

  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return { valid: false, error: "僅支援 JPG、PNG、WebP 格式" };
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, error: "圖片大小不可超過 2MB" };
  }

  return { valid: true };
}

/**
 * 將檔案轉換為 base64 data URL 字串
 *
 * @param file - 要轉換的檔案
 * @returns Promise，解析為 data URL 字串
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error("檔案讀取失敗"));
    reader.readAsDataURL(file);
  });
}
