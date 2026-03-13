import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// 載入 E2E 測試環境變數
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const env = process.env;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "cd backend && go run ./cmd/server/",
      port: 8080,
      reuseExistingServer: !env["CI"],
      env: {
        DATABASE_URL: env["DATABASE_URL"]!,
        REDIS_URL: env["REDIS_URL"]!,
        JWT_SECRET: env["JWT_SECRET"]!,
        JWT_EXPIRY_HOURS: env["JWT_EXPIRY_HOURS"]!,
        ENVIRONMENT: env["ENVIRONMENT"]!,
        PORT: env["PORT"]!,
        CORS_ORIGINS: env["CORS_ORIGINS"]!,
      },
    },
    {
      command: "npm run dev",
      port: 3000,
      reuseExistingServer: !env["CI"],
      env: {
        NEXT_PUBLIC_APP_URL: env["NEXT_PUBLIC_APP_URL"]!,
        GO_BACKEND_URL: env["GO_BACKEND_URL"]!,
        NEXT_PUBLIC_GO_WS_URL: env["NEXT_PUBLIC_GO_WS_URL"]!,
        NEXT_PUBLIC_USE_NATIVE_WS: env["NEXT_PUBLIC_USE_NATIVE_WS"]!,
      },
    },
  ],
});
