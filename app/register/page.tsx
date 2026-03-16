/**
 * 註冊頁面
 *
 * Dark Tech 風格的使用者註冊表單。
 * 透過 proxy 呼叫 Go backend 註冊，token 由後端設定 HttpOnly cookie。
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/api/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // 前端密碼長度驗證
    if (password.length < 6) {
      setError("密碼至少需要 6 個字元");
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name);
      // Token 由後端透過 Set-Cookie 設定，前端不碰
      router.push("/controller");
    } catch (err) {
      setError(err instanceof Error ? err.message : "註冊失敗，請稍後再試");
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
          <p className="mt-2 font-body text-text-muted">建立你的帳號</p>
        </div>

        {/* 註冊卡片 */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 錯誤訊息 */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-body">
                {error}
              </div>
            )}

            {/* 名稱欄位 */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-body text-text-muted"
              >
                名稱
                <span className="text-text-dim ml-1">（選填）</span>
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的名稱"
                className="input-tech"
                disabled={loading}
              />
            </div>

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
                <span className="text-text-dim ml-1">（至少 6 個字元）</span>
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="input-tech"
                disabled={loading}
              />
            </div>

            {/* 註冊按鈕 */}
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
                  註冊中...
                </span>
              ) : (
                "建立帳號"
              )}
            </button>
          </form>

          {/* 切換連結 */}
          <p className="mt-6 text-center text-sm font-body text-text-muted">
            已有帳號？{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary-300 transition-colors duration-200"
            >
              登入
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
