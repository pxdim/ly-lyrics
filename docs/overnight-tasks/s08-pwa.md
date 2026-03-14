# S08: PWA 離線支援

## 目標
將 LY 歌詞顯示系統轉為 Progressive Web App，支援加到主畫面和基本離線快取。

## 參考檔案（請先讀取）
- `app/layout.tsx` — 根佈局（加入 PWA meta tags）
- `public/` — 公共資源目錄
- `next.config.ts` — Next.js 設定
- `app/icon.svg` — 現有 icon

## 新建檔案
- `public/manifest.json` — PWA manifest
- `public/sw.js` — Service Worker（基本快取策略）
- `public/icons/icon-192.png` — 192x192 app icon（可用 SVG 轉或 placeholder）
- `public/icons/icon-512.png` — 512x512 app icon

## 修改檔案
- `app/layout.tsx` — 加入 manifest link + PWA meta tags + SW 註冊

## 實作細節

### manifest.json
```json
{
  "name": "LY 歌詞顯示系統",
  "short_name": "LY Lyrics",
  "description": "即時歌詞顯示與多裝置同步系統",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#06b6d4",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker (sw.js)
基本 Cache-First 策略，只快取靜態資源：
```javascript
const CACHE_NAME = "ly-v1";
const STATIC_ASSETS = ["/", "/controller", "/display"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  // Network-first for API calls
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});
```

### layout.tsx 修改
在 `<head>` 中加入：
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#06b6d4" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

在 layout 客戶端部分加入 SW 註冊：
```typescript
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // SW 註冊失敗（非 HTTPS 環境），靜默忽略
  });
}
```

### App Icons
由於不需要設計精美的 icon，可以：
1. 先建立簡單的 placeholder（用 canvas 或 SVG 產生）
2. 或者用現有的 `app/icon.svg` 轉換
3. 最簡單：用一個小的 Node script 產生 PNG，或直接 copy 一個基本 icon

建議最簡方案：建立一個簡單的 SVG icon 轉 PNG script，或直接用 CSS 背景色 + 文字 "LY" 的 canvas 產生。

實際做法：直接用 sharp 或 canvas 庫產生，或如果不想安裝依賴，就建立兩個小的 SVG 檔案作為 icon 替代品（瀏覽器也支援 SVG manifest icon）。

最務實做法：manifest 中 icon 可先指向 `/icon.svg` 並設定對應 size，不需要 PNG。

## 驗收標準
- [ ] manifest.json 在 public/ 中
- [ ] Service Worker 基本快取可用
- [ ] layout.tsx 有 PWA meta tags
- [ ] Lighthouse PWA 檢查基本通過（可用 `npx lighthouse --only-categories=pwa` 本地測試）
- [ ] npm run build 通過
- [ ] npx vitest run 通過

## Commit
```
feat(pwa): add manifest, service worker, and PWA meta tags for offline support
```
