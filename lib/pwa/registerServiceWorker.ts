/**
 * 註冊 Service Worker
 * 瀏覽器不支援或註冊失敗時靜默處理（非 HTTPS 環境等）
 */
export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    // SW 註冊失敗（非 HTTPS 環境），靜默忽略
  }
}
