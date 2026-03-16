/**
 * 登入頁面
 *
 * 使用 AuthLayout、GlowInput、GlowButton 共用元件重新設計。
 * 透過 proxy 呼叫 Go backend 認證，token 由後端設定 HttpOnly cookie。
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GlowInput } from "@/components/ui/GlowInput";
import { GlowButton } from "@/components/ui/GlowButton";

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
      await login(email, password);
      router.push("/controller");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="登入歌詞顯示系統"
      footer={
        <p>
          還沒有帳號？{" "}
          <Link
            href="/register"
            className="text-primary hover:text-primary-300 transition-colors duration-[var(--duration-fast)]"
          >
            註冊
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 錯誤訊息 */}
        {error && (
          <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-sm font-body animate-shake">
            {error}
          </div>
        )}

        <GlowInput
          label="Email"
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={loading}
        />

        <GlowInput
          label="密碼"
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
          disabled={loading}
        />

        <GlowButton
          type="submit"
          loading={loading}
          className="w-full"
        >
          {loading ? "登入中..." : "登入"}
        </GlowButton>
      </form>
    </AuthLayout>
  );
}
