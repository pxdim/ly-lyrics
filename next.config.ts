import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl 插件 — 指向 i18n/request.ts 設定檔
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Go 後端 URL（由環境變數設定，預設為本地開發位址）
const goBackendUrl = process.env["GO_BACKEND_URL"] || "http://localhost:8080";

// 推導客戶端 WebSocket URL
// Railway build step 不提供 NEXT_PUBLIC_* 和 RAILWAY_SERVICE_* 變數，
// 所以 production 環境直接使用已知的公開網域
function resolveWsUrl(): string {
  // 1. 明確設定優先
  if (process.env["NEXT_PUBLIC_GO_WS_URL"]) {
    return process.env["NEXT_PUBLIC_GO_WS_URL"];
  }
  // 2. 從 Railway service URL 推導
  if (process.env["RAILWAY_SERVICE_LY_GO_BACKEND_URL"]) {
    return `wss://${process.env["RAILWAY_SERVICE_LY_GO_BACKEND_URL"]}/ws`;
  }
  // 3. Production 環境使用已知網域
  if (process.env["NODE_ENV"] === "production" || process.env["RAILWAY_ENVIRONMENT"]) {
    return "wss://ly-go-backend-production.up.railway.app/ws";
  }
  // 4. 本地開發
  return "ws://localhost:8080/ws";
}
const goWsUrl = resolveWsUrl();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Docker/Railway 部署使用 standalone 模式，減少 image 大小
  output: "standalone",
  // 明確將環境變數內聯到客戶端 bundle
  // Railway 的 NEXT_PUBLIC_ 變數在 build time 可能不可用，
  // 所以這裡用 server-side 變數推導後傳入
  env: {
    NEXT_PUBLIC_GO_WS_URL: goWsUrl,
    NEXT_PUBLIC_USE_NATIVE_WS: process.env["NEXT_PUBLIC_USE_NATIVE_WS"] || "true",
    NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"] || "",
  },
  // 安全 HTTP 標頭 — 防禦 XSS、clickjacking、MIME sniffing 等常見攻擊
  // CSP 使用 Report-Only 模式，避免過度限制導致功能異常，
  // 待觀察 report 確認無誤後再切換為強制模式
  async headers() {
    // CSP 指令 — 根據 LY 實際使用的資源來源設定
    const cspDirectives = [
      "default-src 'self'",
      // Next.js 需要 'unsafe-eval' 用於開發模式 HMR；
      // 生產環境僅允許 'self'
      `script-src 'self'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      // Next.js 與 Tailwind 產生的樣式需要 'unsafe-inline'
      "style-src 'self' 'unsafe-inline'",
      // Google Fonts 字體檔案來源
      "font-src 'self' data: https://fonts.gstatic.com",
      // 圖片允許 data URI（base64 圖片）與 blob（canvas 匯出）
      "img-src 'self' data: blob:",
      // WebSocket 連線（ws: 用於本地開發，wss: 用於生產環境）
      "connect-src 'self' ws://localhost:* wss://*.up.railway.app wss://ly-go-backend-production.up.railway.app",
      // Service Worker 來源
      "worker-src 'self' blob:",
      // 禁止 iframe 嵌入（防止 clickjacking）
      "frame-ancestors 'none'",
      // 限制 <form> 提交目標
      "form-action 'self'",
      // 限制 <base> 標籤（防止 base tag hijacking）
      "base-uri 'self'",
    ];
    const cspValue = cspDirectives.join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          // 防止瀏覽器 MIME type 嗅探，強制使用 Content-Type 宣告的類型
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // 禁止頁面被嵌入 iframe（防止 clickjacking 攻擊）
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // 啟用瀏覽器內建 XSS 過濾器（主要用於舊版瀏覽器）
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // 控制 Referer 標頭的洩漏範圍
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // 限制瀏覽器 API 權限 — microphone 允許 self（AI 聽歌追蹤功能需要）
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          // CSP Report-Only — 記錄違規但不阻擋，待確認無誤後再切換為 Content-Security-Policy
          {
            key: "Content-Security-Policy-Report-Only",
            value: cspValue,
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          // 將所有 /api/* 請求代理到 Go 後端
          source: "/api/:path*",
          destination: `${goBackendUrl}/api/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default withNextIntl(nextConfig);
