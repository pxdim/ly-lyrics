import type { NextConfig } from "next";

// Go 後端 URL（由環境變數設定，預設為本地開發位址）
const goBackendUrl = process.env["GO_BACKEND_URL"] || "http://localhost:8080";

// 推導 WebSocket URL：優先使用明確設定，否則從 Go backend domain 推導
const goWsUrl =
  process.env["NEXT_PUBLIC_GO_WS_URL"] ||
  (process.env["RAILWAY_SERVICE_LY_GO_BACKEND_URL"]
    ? `wss://${process.env["RAILWAY_SERVICE_LY_GO_BACKEND_URL"]}/ws`
    : "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 明確將環境變數內聯到客戶端 bundle
  // Railway 的 NEXT_PUBLIC_ 變數在 build time 可能不可用，
  // 所以這裡用 server-side 變數推導後傳入
  env: {
    NEXT_PUBLIC_GO_WS_URL: goWsUrl,
    NEXT_PUBLIC_USE_NATIVE_WS: process.env["NEXT_PUBLIC_USE_NATIVE_WS"] || "true",
    NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"] || "",
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

export default nextConfig;
