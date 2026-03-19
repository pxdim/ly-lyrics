// LY 歌詞顯示系統 — Service Worker (NFR2.4 離線支援)
//
// 快取策略：
//   - HTML 頁面 (navigation)：Network First → 離線時回傳快取版本
//   - Next.js 靜態資源 (_next/static/)：Cache First（Immutable，hash 在路徑中）
//   - API 呼叫 (/api/)：Network Only（不快取，離線時不回傳過期資料）
//   - WebSocket：不經過 Service Worker
//   - 其他資源（字體、圖片）：Stale While Revalidate

const CACHE_VERSION = "ly-v2";

// 預快取核心頁面（install 時快取 shell）
const PRECACHE_URLS = [
  "/",
  "/display",
  "/manifest.json",
];

// ============================================================================
// Install：預快取核心資源
// ============================================================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // 跳過等待，立即接管
  self.skipWaiting();
});

// ============================================================================
// Activate：清理舊版本快取
// ============================================================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  // 立即接管所有已開啟的頁面
  self.clients.claim();
});

// ============================================================================
// Fetch：依資源類型選擇策略
// ============================================================================

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只處理 GET 請求（POST/PUT/DELETE 等不快取）
  if (request.method !== "GET") {
    return;
  }

  // 跳過非 http/https（如 chrome-extension://）
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // --- API 呼叫：Network Only ---
  // API 資料不應快取，離線時讓 fetch 自然失敗，由前端 error handling 處理
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // --- Next.js 靜態資源：Cache First ---
  // _next/static/ 路徑含 content hash，內容不可變，可安心長期快取
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // --- HTML 頁面 (navigation request)：Network First ---
  // 有網路時取最新版，離線時回傳快取版本
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // --- 其他資源（字體、圖片、manifest）：Stale While Revalidate ---
  event.respondWith(staleWhileRevalidate(request));
});

// ============================================================================
// 快取策略函式
// ============================================================================

/**
 * Cache First — 快取優先，無快取時才走網路
 * 適用：不可變資源（_next/static/）
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Network First — 網路優先，失敗時回傳快取
 * 適用：HTML 頁面（確保使用者看到最新內容，離線時仍可瀏覽）
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // 網路失敗 → 回傳快取版本
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // 無快取 → 回傳基本離線頁面
    return new Response(
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>LY — 離線</title></head>" +
      "<body style='background:#0a0a0a;color:#fff;display:flex;align-items:center;" +
      "justify-content:center;height:100vh;font-family:sans-serif'>" +
      "<div style='text-align:center'><h1>LY</h1><p>目前離線，請檢查網路連線</p></div>" +
      "</body></html>",
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

/**
 * Stale While Revalidate — 先回傳快取，同時在背景更新
 * 適用：字體、圖片等可容忍短暫過期的資源
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);

  // 不論是否有快取，都在背景嘗試更新
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // 網路失敗時忽略（若有快取則已回傳）
    });

  // 有快取則立即回傳，無快取則等待網路
  if (cached) {
    return cached;
  }

  const response = await fetchPromise;
  if (response) {
    return response;
  }

  // 完全無法取得資源
  return new Response("", { status: 408 });
}
