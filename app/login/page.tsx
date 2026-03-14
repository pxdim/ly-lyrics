/**
 * 登入頁面
 *
 * Dark Tech 風格的使用者登入表單。
 * 呼叫 Go backend API 進行認證，JWT token 存入 cookie。
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);

      // 儲存 access token 到 cookie
      document.cookie = `access_token=${result.accessToken}; path=/; SameSite=Lax`;

      // 儲存 refresh token 到 localStorage
      localStorage.setItem("refresh_token", result.refreshToken);

      // 導向控制台
      router.push("/controller");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-void text-text-primary relative overflow-hidden">
      {/* 背景效果 */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-50" />

      <div className="w-full max-w-md relative z-10">
        {/* 標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold tracking-wider">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              LY
            </span>
          </h1>
          <p className="mt-2 font-body text-text-muted">登入歌詞顯示系統</p>
        </div>

        {/* 登入卡片 */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 錯誤訊息 */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-body">
                {error}
              </div>
            )}

            {/* Email 欄位 */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-body text-text-muted"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input-tech"
                disabled={loading}
              />
            </div>

            {/* 密碼欄位 */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-body text-text-muted"
              >
                密碼
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="input-tech"
                disabled={loading}
              />
            </div>

            {/* 登入按鈕 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-neon disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  登入中...
                </span>
              ) : (
                "登入"
              )}
            </button>
          </form>

          {/* 切換連結 */}
          <p className="mt-6 text-center text-sm font-body text-text-muted">
            還沒有帳號？{" "}
            <Link
              href="/register"
              className="text-primary hover:text-primary-300 transition-colors duration-200"
            >
              註冊
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
