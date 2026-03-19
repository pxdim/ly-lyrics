import type { NextConfig } from "next";

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
