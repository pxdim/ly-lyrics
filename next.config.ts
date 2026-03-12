import type { NextConfig } from "next";

// Go 後端 URL（由環境變數設定，預設為本地開發位址）
const goBackendUrl = process.env["GO_BACKEND_URL"] || "http://localhost:8080";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
