import type { NextConfig } from "next";

// Go 後端 URL（由環境變數設定，預設為本地開發位址）
const goBackendUrl = process.env["GO_BACKEND_URL"] || "http://localhost:8080";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 明確將 NEXT_PUBLIC_ 環境變數內聯到客戶端 bundle
  // （避免 TypeScript noPropertyAccessFromIndexSignature 與 Next.js 點號語法衝突）
  env: {
    NEXT_PUBLIC_GO_WS_URL: process.env["NEXT_PUBLIC_GO_WS_URL"] || "",
    NEXT_PUBLIC_USE_NATIVE_WS: process.env["NEXT_PUBLIC_USE_NATIVE_WS"] || "",
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
